import * as cheerio from "cheerio";
import type { Cheerio } from "cheerio";
import type { AnyNode } from "domhandler";
import type { ParsedCoach, Parser } from "./types.js";

function decodeCFEmail(encoded: string): string {
  const key = parseInt(encoded.slice(0, 2), 16);
  let decoded = "";
  for (let i = 2; i < encoded.length; i += 2) {
    decoded += String.fromCharCode(parseInt(encoded.slice(i, i + 2), 16) ^ key);
  }
  return decoded;
}

function extractEmail($el: Cheerio<AnyNode>): string | null {
  const mailto = $el.find("a[href^='mailto:']").first();
  if (mailto.length) return mailto.attr("href")!.replace(/^mailto:/i, "").trim().toLowerCase();
  const cf = $el.find("[data-cfemail]").first();
  if (cf.length) return decodeCFEmail(cf.attr("data-cfemail")!).toLowerCase();
  const match = $el.text().match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
  if (match) return match[0].toLowerCase().trim();
  return null;
}

function extractPhone($el: Cheerio<AnyNode>): string | null {
  const tel = $el.find("a[href^='tel:']").first();
  if (tel.length) return tel.attr("href")!.replace(/^tel:/i, "").trim();
  return null;
}

function extractBioUrl($el: Cheerio<AnyNode>, baseUrl: string): string | null {
  const link = $el.find(".s-person-card-name a, a[href*='/coaches/'], a[href*='/staff/'], a[href*='/roster/coaches/']").first();
  if (!link.length) return null;
  const href = link.attr("href");
  if (!href) return null;
  if (href.startsWith("http")) return href;
  try { return new URL(href, baseUrl).toString(); } catch { return null; }
}

// ─── Nuxt 3 __NUXT_DATA__ parser ─────────────────────────────────────────────
// SIDEARM's v3 sites embed all data in a flat indexed JSON array.
// Handles both camelCase (firstName/lastName) and snake_case (first_name/last_name).

function resolveStr(data: unknown[], idx: unknown): string {
  if (typeof idx !== "number" || idx < 0 || idx >= data.length) return "";
  const val = data[idx];
  return typeof val === "string" ? val.trim() : "";
}

function parseNuxtData(html: string): ParsedCoach[] {
  const match = html.match(/<script[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) return [];

  let data: unknown[];
  try { data = JSON.parse(match[1]); } catch { return []; }
  if (!Array.isArray(data)) return [];

  const results: ParsedCoach[] = [];

  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    if (typeof item !== "object" || item === null || Array.isArray(item)) continue;
    const obj = item as Record<string, unknown>;

    // Support camelCase (firstName/lastName) and snake_case (first_name/last_name)
    const hasCamel = "firstName" in obj && "lastName" in obj;
    const hasSnake = "first_name" in obj && "last_name" in obj;
    if (!hasCamel && !hasSnake) continue;

    const firstName = hasCamel ? resolveStr(data, obj.firstName) : resolveStr(data, obj.first_name);
    const lastName  = hasCamel ? resolveStr(data, obj.lastName)  : resolveStr(data, obj.last_name);
    const name = `${firstName} ${lastName}`.trim();
    if (!name) continue;

    // camelCase uses "title"; snake_case may use "title", "position", or "staff_title"
    const titleKey = hasCamel
      ? obj.title
      : (obj.title ?? obj.position ?? obj.staff_title);
    const title = resolveStr(data, titleKey);

    const emailRaw = resolveStr(data, obj.email);
    const email = emailRaw && emailRaw.includes("@") ? emailRaw.toLowerCase() : null;

    const phoneRaw = resolveStr(data, obj.phone);
    const phone = phoneRaw || null;

    results.push({ name, title, email, phone, bioUrl: null });
  }

  return results;
}

// ─── Legacy SIDEARM v1 HTML parser (.sidearm-coaches-coach table rows) ────────

function parseLegacyCards(html: string, baseUrl: string): ParsedCoach[] {
  const $ = cheerio.load(html);
  const results: ParsedCoach[] = [];

  $(".sidearm-coaches-coach").each((_, el) => {
    const $el = $(el);
    const $nameEl = $el.find("th a").first();
    const name = $nameEl.text().trim();
    if (!name) return;

    const tds = $el.find("td");
    const title = $(tds.get(0)).text().trim();

    const email = extractEmail($el);
    const phone = extractPhone($el);

    let bioUrl: string | null = null;
    if (!email) {
      const href = $nameEl.attr("href");
      if (href) {
        try { bioUrl = href.startsWith("http") ? href : new URL(href, baseUrl).toString(); } catch {}
      }
    }

    results.push({ name, title, email, phone, bioUrl });
  });

  return results;
}

// ─── Modern SIDEARM HTML card parser (.s-person-card) ─────────────────────────

function parseCard($el: Cheerio<AnyNode>, baseUrl: string): ParsedCoach | null {
  const name = $el.find(".s-person-card-name, .s-person__name, [class*='person-name']").first().text().trim();
  const title = $el.find(".s-person-card-title, .s-person__title, [class*='person-title']").first().text().trim();
  if (!name) return null;
  const email = extractEmail($el);
  const phone = extractPhone($el);
  const bioUrl = email ? null : extractBioUrl($el, baseUrl);
  return { name, title, email, phone, bioUrl };
}

function parseModernCards(html: string, baseUrl: string): ParsedCoach[] {
  const $ = cheerio.load(html);
  const results: ParsedCoach[] = [];
  const cardSelectors = [
    ".s-person-card", ".sidearm-roster .roster-card",
    "li[class*='s-person']", ".person-card", "[class*='s-person-card']",
  ];
  let cards: Cheerio<AnyNode> | null = null;
  for (const sel of cardSelectors) {
    const found = $(sel);
    if (found.length > 0) { cards = found; break; }
  }
  if (!cards || cards.length === 0) return results;
  cards.each((_, el) => {
    const coach = parseCard($(el), baseUrl);
    if (coach) results.push(coach);
  });
  return results;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export const sidearmParser: Parser = (html, baseUrl) => {
  // 1. Nuxt3 data blob (newest SIDEARM — camelCase or snake_case)
  const nuxt = parseNuxtData(html);
  if (nuxt.length > 0) return nuxt;

  // 2. Legacy v1 table format (.sidearm-coaches-coach)
  const legacy = parseLegacyCards(html, baseUrl);
  if (legacy.length > 0) return legacy;

  // 3. Modern HTML cards (.s-person-card)
  return parseModernCards(html, baseUrl);
};

export function detectSidearm(html: string): boolean {
  return (
    /sidearm/i.test(html) ||
    html.includes("s-person-card") ||
    html.includes("sidearm-roster") ||
    html.includes("sidearm-coaches-coach") ||
    html.toLowerCase().includes('"generator" content="sidearm') ||
    html.includes("__NUXT_DATA__")
  );
}
