/**
 * scrape-coaches.ts — Spotr B2B outreach data collector
 *
 * Purpose: Collect publicly-listed coaching staff contact info from college
 * athletics websites so Spotr can reach out to coaches about joining the platform.
 *
 * Compliance:
 *  - Only scrapes public staff/coach directory pages — no athlete data, no private info.
 *  - Respects robots.txt before fetching any URL.
 *  - User-Agent identifies Spotr with a contact email so site owners can reach us.
 *  - Any site owner requesting removal should have their domain added to
 *    config.blocklist in scrape-coaches.config.ts.
 */

import axios from "axios";
import * as cheerio from "cheerio";
import * as fs from "fs";
import * as path from "path";
import { createObjectCsvWriter } from "csv-writer";
import { config } from "./scrape-coaches.config.js";
import { sidearmParser, detectSidearm } from "./parsers/sidearm.js";
import { prestoParser, detectPresto } from "./parsers/presto.js";
import { genericParser } from "./parsers/generic.js";
import type { ParsedCoach, CmsType } from "./parsers/types.js";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SchoolLog {
  school: string;
  url: string;
  status:
    | "success"
    | "skipped_robots"
    | "skipped_blocklist"
    | "js_rendered"
    | "parse_failed"
    | "http_error"
    | "no_coaches_after_filter";
  cms: CmsType | "auto" | "unknown";
  coachesFound: number;
  coachesKept: number;
  note?: string;
}

interface CsvRow {
  school: string;
  name: string;
  title: string;
  email: string;
  phone: string;
  source_url: string;
  scraped_at: string;
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

const http = axios.create({
  timeout: 15000,
  headers: { "User-Agent": config.userAgent },
});

async function fetchHtml(url: string): Promise<{ html: string; status: number }> {
  const res = await http.get<string>(url, { responseType: "text" });
  return { html: res.data, status: res.status };
}

// ─── Robots.txt ───────────────────────────────────────────────────────────────

interface RobotsResult {
  allowed: boolean;
  crawlDelay: number | null;
}

async function checkRobots(pageUrl: string): Promise<RobotsResult> {
  const u = new URL(pageUrl);
  const robotsUrl = `${u.protocol}//${u.host}/robots.txt`;
  try {
    const { html } = await fetchHtml(robotsUrl);
    return parseRobots(html, u.pathname);
  } catch {
    // robots.txt fetch failed — assume allowed
    return { allowed: true, crawlDelay: null };
  }
}

function parseRobots(robotsTxt: string, pathname: string): RobotsResult {
  const lines = robotsTxt.split("\n").map(l => l.trim());
  let inRelevantBlock = false;
  let crawlDelay: number | null = null;
  let explicitly_disallowed = false;

  for (const line of lines) {
    if (line.toLowerCase().startsWith("user-agent:")) {
      const agent = line.slice("user-agent:".length).trim();
      inRelevantBlock = agent === "*" || agent.toLowerCase() === "spotrbot";
    }
    if (!inRelevantBlock) continue;
    if (line.toLowerCase().startsWith("disallow:")) {
      const disallowed = line.slice("disallow:".length).trim();
      if (disallowed && pathname.startsWith(disallowed)) {
        explicitly_disallowed = true;
      }
    }
    if (line.toLowerCase().startsWith("crawl-delay:")) {
      const val = parseInt(line.slice("crawl-delay:".length).trim(), 10);
      if (!isNaN(val)) crawlDelay = val * 1000; // convert to ms
    }
  }

  return { allowed: !explicitly_disallowed, crawlDelay };
}

// ─── CMS detection ────────────────────────────────────────────────────────────

function detectCms(html: string): CmsType {
  if (detectSidearm(html)) return "sidearm";
  if (detectPresto(html)) return "presto";
  return "generic";
}

function isJsRendered(html: string, url: string): boolean {
  const $ = cheerio.load(html);
  const bodyText = $("body").text().trim();
  // Very short body with JS framework markers = likely JS-rendered
  return (
    bodyText.length < 500 &&
    (html.includes("__NEXT_DATA__") ||
      html.includes("window.__") ||
      html.includes("ng-app") ||
      html.includes("data-reactroot"))
  );
}

// ─── Email extraction from bio page ──────────────────────────────────────────

function extractEmailFromHtml(html: string): string | null {
  const $ = cheerio.load(html);

  // Cloudflare
  const cf = $("[data-cfemail]").first();
  if (cf.length) {
    const encoded = cf.attr("data-cfemail")!;
    const key = parseInt(encoded.slice(0, 2), 16);
    let decoded = "";
    for (let i = 2; i < encoded.length; i += 2) {
      decoded += String.fromCharCode(parseInt(encoded.slice(i, i + 2), 16) ^ key);
    }
    return decoded.toLowerCase();
  }

  const mailto = $("a[href^='mailto:']").first();
  if (mailto.length) {
    return mailto.attr("href")!.replace(/^mailto:/i, "").trim().toLowerCase();
  }

  const match = $("body").text().match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
  if (match) return match[0].toLowerCase().trim();
  return null;
}

// ─── Role filter ──────────────────────────────────────────────────────────────

function passesFilter(coach: ParsedCoach): boolean {
  if (!config.roleFilters.length) return true;
  return config.roleFilters.some(re => re.test(coach.title));
}

// ─── CSV helpers ──────────────────────────────────────────────────────────────

const CSV_PATH = path.resolve("data/coaches.csv");
const LOG_PATH = path.resolve("data/scrape-log.json");

function loadExistingKeys(): Set<string> {
  const keys = new Set<string>();
  if (!fs.existsSync(CSV_PATH)) return keys;
  const content = fs.readFileSync(CSV_PATH, "utf-8");
  const lines = content.split("\n").slice(1); // skip header
  for (const line of lines) {
    if (!line.trim()) continue;
    // CSV: school,name,title,email,phone,source_url,scraped_at
    const parts = line.split(",");
    const school = parts[0]?.replace(/^"|"$/g, "").trim();
    const name = parts[1]?.replace(/^"|"$/g, "").trim();
    if (school && name) keys.add(`${school}::${name}`);
  }
  return keys;
}

async function appendToCsv(rows: CsvRow[], existingKeys: Set<string>): Promise<number> {
  const newRows = rows.filter(r => !existingKeys.has(`${r.school}::${r.name}`));
  if (newRows.length === 0) return 0;

  const fileExists = fs.existsSync(CSV_PATH);
  const writer = createObjectCsvWriter({
    path: CSV_PATH,
    header: [
      { id: "school", title: "school" },
      { id: "name", title: "name" },
      { id: "title", title: "title" },
      { id: "email", title: "email" },
      { id: "phone", title: "phone" },
      { id: "source_url", title: "source_url" },
      { id: "scraped_at", title: "scraped_at" },
    ],
    append: fileExists,
  });

  await writer.writeRecords(newRows);
  newRows.forEach(r => existingKeys.add(`${r.school}::${r.name}`));
  return newRows.length;
}

// ─── Delay ────────────────────────────────────────────────────────────────────

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ─── Main scrape logic per school ─────────────────────────────────────────────

async function scrapeSchool(
  school: { name: string; url: string; cms: string },
  existingKeys: Set<string>
): Promise<SchoolLog> {
  const log: SchoolLog = {
    school: school.name,
    url: school.url,
    status: "success",
    cms: school.cms as CmsType | "auto",
    coachesFound: 0,
    coachesKept: 0,
  };

  // Blocklist check
  try {
    const hostname = new URL(school.url).hostname;
    if (config.blocklist.some(b => hostname.includes(b))) {
      log.status = "skipped_blocklist";
      log.note = "Domain in blocklist";
      return log;
    }
  } catch {
    log.status = "http_error";
    log.note = "Invalid URL";
    return log;
  }

  // Robots.txt
  if (config.respectRobotsTxt) {
    const { allowed, crawlDelay } = await checkRobots(school.url);
    if (!allowed) {
      log.status = "skipped_robots";
      log.note = "Disallowed by robots.txt";
      return log;
    }
    if (crawlDelay && crawlDelay > config.requestDelayMs) {
      await delay(crawlDelay);
    }
  }

  // Fetch directory page
  let html: string;
  try {
    const result = await fetchHtml(school.url);
    html = result.html;
  } catch (err: any) {
    log.status = "http_error";
    const msg = err?.response
      ? `HTTP ${err.response.status}: ${String(err.response.data).slice(0, 200)}`
      : String(err.message ?? err);
    log.note = msg;
    return log;
  }

  // JS-rendered detection
  if (isJsRendered(html, school.url)) {
    log.status = "js_rendered";
    log.note = "Page body too short — likely JS-rendered, needs Playwright";
    return log;
  }

  // CMS detection
  const cms: CmsType =
    school.cms === "auto" ? detectCms(html) : (school.cms as CmsType);
  log.cms = cms;

  // Parse
  const parser =
    cms === "sidearm" ? sidearmParser : cms === "presto" ? prestoParser : genericParser;
  let coaches = parser(html, school.url);
  log.coachesFound = coaches.length;

  // parse_failed heuristic: big HTML with "coach" but zero results
  if (coaches.length === 0 && html.length > 50_000 && /coach/i.test(html)) {
    log.status = "parse_failed";
    log.note = `HTML is ${Math.round(html.length / 1024)}KB and mentions "coach" but parser returned 0 results`;
    return log;
  }

  // Filter by role
  coaches = coaches.filter(passesFilter);

  // Follow bio pages for email-less coaches (one level deep, same delay)
  for (const coach of coaches) {
    if (!coach.email && coach.bioUrl) {
      await delay(config.requestDelayMs);
      try {
        const { html: bioHtml } = await fetchHtml(coach.bioUrl);
        coach.email = extractEmailFromHtml(bioHtml);
      } catch {
        // bio fetch failed — keep coach with null email
      }
      coach.bioUrl = null; // consumed
    }
  }

  // Keep all coaches that passed role filter (even no contact info)
  log.coachesKept = coaches.length;

  if (coaches.length === 0) {
    log.status = "no_coaches_after_filter";
    log.note = "Parsed coaches but none matched roleFilters";
    return log;
  }

  // Build CSV rows
  const scrapedAt = new Date().toISOString();
  const rows: CsvRow[] = coaches.map(c => ({
    school: school.name,
    name: c.name,
    title: c.title,
    email: c.email ?? "",
    phone: c.phone ?? "",
    source_url: school.url,
    scraped_at: scrapedAt,
  }));

  await appendToCsv(rows, existingKeys);
  return log;
}

// ─── Entry point ──────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nSpotr Coach Scraper — ${new Date().toISOString()}`);
  console.log(`Schools: ${config.schools.length} | Delay: ${config.requestDelayMs}ms | Concurrent: ${config.maxConcurrent}\n`);

  // Ensure data dir
  fs.mkdirSync("data", { recursive: true });

  const existingKeys = loadExistingKeys();
  const logs: SchoolLog[] = [];

  for (let i = 0; i < config.schools.length; i++) {
    const school = config.schools[i];
    console.log(`[${i + 1}/${config.schools.length}] ${school.name} …`);

    let schoolLog: SchoolLog;
    try {
      schoolLog = await scrapeSchool(school, existingKeys);
    } catch (err: any) {
      schoolLog = {
        school: school.name,
        url: school.url,
        status: "http_error",
        cms: "unknown",
        coachesFound: 0,
        coachesKept: 0,
        note: String(err?.message ?? err),
      };
    }

    logs.push(schoolLog);

    const icon =
      schoolLog.status === "success"
        ? "✓"
        : schoolLog.status.startsWith("skipped")
        ? "–"
        : "✗";
    const note = schoolLog.note ? ` (${schoolLog.note})` : "";
    console.log(
      `  ${icon} ${schoolLog.status.padEnd(25)} cms=${schoolLog.cms.padEnd(10)} found=${schoolLog.coachesFound} kept=${schoolLog.coachesKept}${note}`
    );

    // Delay between schools (skip after last)
    if (i < config.schools.length - 1) {
      await delay(config.requestDelayMs);
    }
  }

  // Summary
  const succeeded = logs.filter(l => l.status === "success").length;
  const skipped = logs.filter(l => l.status.startsWith("skipped")).length;
  const failed = logs.filter(l =>
    ["http_error", "parse_failed", "js_rendered", "no_coaches_after_filter"].includes(l.status)
  ).length;
  const totalKept = logs.reduce((s, l) => s + l.coachesKept, 0);

  console.log(`\n${"─".repeat(60)}`);
  console.log(`Results: ${succeeded} success | ${skipped} skipped | ${failed} failed`);
  console.log(`Coaches written to CSV this run: ${totalKept}`);
  console.log(`CSV: ${CSV_PATH}`);
  console.log(`${"─".repeat(60)}\n`);

  // Write log
  const runLog = {
    runAt: new Date().toISOString(),
    summary: { schools: config.schools.length, succeeded, skipped, failed, totalKept },
    schools: logs,
  };

  let existingLog: any[] = [];
  if (fs.existsSync(LOG_PATH)) {
    try {
      existingLog = JSON.parse(fs.readFileSync(LOG_PATH, "utf-8"));
    } catch {}
  }
  existingLog.push(runLog);
  fs.writeFileSync(LOG_PATH, JSON.stringify(existingLog, null, 2));
  console.log(`Log written to ${LOG_PATH}`);
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
