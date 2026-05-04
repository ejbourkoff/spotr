import * as cheerio from "cheerio";
import type { Cheerio, CheerioAPI } from "cheerio";
import type { AnyNode, Element } from "domhandler";
import type { ParsedCoach, Parser } from "./types.js";

function decodeCFEmail(encoded: string): string {
  const key = parseInt(encoded.slice(0, 2), 16);
  let decoded = "";
  for (let i = 2; i < encoded.length; i += 2) {
    decoded += String.fromCharCode(parseInt(encoded.slice(i, i + 2), 16) ^ key);
  }
  return decoded;
}

const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/;

function extractEmailFromEl($el: Cheerio<AnyNode>, $: CheerioAPI): string | null {
  const mailto = $el.find("a[href^='mailto:']").first();
  if (mailto.length) return mailto.attr("href")!.replace(/^mailto:/i, "").trim().toLowerCase();
  const cf = $el.find("[data-cfemail]").first();
  if (cf.length) return decodeCFEmail(cf.attr("data-cfemail")!).toLowerCase();
  const m = $el.text().match(EMAIL_REGEX);
  if (m) return m[0].toLowerCase().trim();
  return null;
}

function extractPhoneFromEl($el: Cheerio<AnyNode>, $: CheerioAPI): string | null {
  const tel = $el.find("a[href^='tel:']").first();
  if (tel.length) return tel.attr("href")!.replace(/^tel:/i, "").trim();
  return null;
}

function extractBioUrl($el: Cheerio<AnyNode>, $: CheerioAPI, baseUrl: string): string | null {
  const link = $el.find("a[href*='/coach'], a[href*='/staff'], a[href*='/personnel'], a[href*='/bios/']").first();
  if (!link.length) return null;
  const href = link.attr("href");
  if (!href) return null;
  if (href.startsWith("http")) return href;
  try { return new URL(href, baseUrl).toString(); } catch { return null; }
}

function parseTable($: CheerioAPI, baseUrl: string): ParsedCoach[] {
  const results: ParsedCoach[] = [];
  $("table").each((_, table) => {
    const headers: string[] = [];
    $(table).find("tr").first().find("th, td").each((_, th) => {
      headers.push($(th).text().trim().toLowerCase());
    });
    if (!headers.some(h => /name|position|title|coach/i.test(h))) return;

    const nameIdx = headers.findIndex(h => /name/i.test(h));
    const titleIdx = headers.findIndex(h => /title|position|role/i.test(h));
    const emailIdx = headers.findIndex(h => /email|e-mail/i.test(h));
    const phoneIdx = headers.findIndex(h => /phone|tel/i.test(h));

    $(table).find("tr").slice(1).each((_, row) => {
      const cells = $(row).find("td");
      if (cells.length === 0) return;
      const name = nameIdx >= 0 ? $(cells.get(nameIdx)!).text().trim() : "";
      const title = titleIdx >= 0 ? $(cells.get(titleIdx)!).text().trim() : "";
      if (!name) return;
      const emailEl = emailIdx >= 0 ? $(cells.get(emailIdx)!) : $(row);
      const phoneEl = phoneIdx >= 0 ? $(cells.get(phoneIdx)!) : $(row);
      const email = extractEmailFromEl(emailEl, $);
      const phone = extractPhoneFromEl(phoneEl, $);
      const bioUrl = email ? null : extractBioUrl($(row), $, baseUrl);
      results.push({ name, title, email, phone, bioUrl });
    });
  });
  return results;
}

function parseByMailto($: CheerioAPI, baseUrl: string): ParsedCoach[] {
  const results: ParsedCoach[] = [];
  const seen = new Set<string>();

  $("a[href^='mailto:'], [data-cfemail]").each((_, el) => {
    const $el = $(el);
    const email = extractEmailFromEl($el, $) ?? extractEmailFromEl($el.parent(), $);
    if (!email || seen.has(email)) return;
    seen.add(email);

    let $container = $el.parent();
    for (let i = 0; i < 4; i++) {
      const text = $container.clone().children().remove().end().text().trim();
      if (text.length >= 5 && text.split(" ").length >= 2) break;
      $container = $container.parent();
    }

    const name = $container.clone().children().remove().end().text().trim()
      || $container.find("[class*='name'], h2, h3, h4, strong").first().text().trim();
    if (!name) return;

    const title = $container.find("[class*='title'], [class*='position'], [class*='role']").first().text().trim();
    const phone = extractPhoneFromEl($container, $);
    results.push({ name, title, email, phone, bioUrl: null });
  });

  return results;
}

function parseDL($: CheerioAPI): ParsedCoach[] {
  const results: ParsedCoach[] = [];
  $("dl").each((_, dl) => {
    const pairs: Record<string, string> = {};
    let lastKey = "";
    $(dl).children().each((_, el) => {
      const node = el as Element;
      if (node.type !== "tag") return;
      if (node.name === "dt") lastKey = $(el).text().trim().toLowerCase();
      else if (node.name === "dd" && lastKey) pairs[lastKey] = $(el).text().trim();
    });
    const name = pairs["name"] || pairs["full name"] || "";
    const title = pairs["title"] || pairs["position"] || pairs["role"] || "";
    const emailRaw = pairs["email"] || "";
    if (name) results.push({ name, title, email: emailRaw.toLowerCase().trim() || null, phone: pairs["phone"] || null, bioUrl: null });
  });
  return results;
}

// WordPress staff-directory theme (LSU, South Carolina, Kentucky, Vanderbilt…)
// Rows: td.staff-directory_table_row_name .name + td.staff-directory_table_row_title p
function parseWordPressStaffDir($: CheerioAPI, baseUrl: string): ParsedCoach[] {
  const results: ParsedCoach[] = [];
  $(".staff-directory__table tr, .staff-directory tr").each((_, row) => {
    const $row = $(row);
    // Skip department separator rows (colspan)
    if ($row.find("[colspan]").length > 0 && $row.find("td").length <= 1) return;
    const name = $row.find(".staff-directory_table_row_name .name, .staff-directory_table_row_name a").first().text().trim();
    if (!name) return;
    const title = $row.find(".staff-directory_table_row_title p, .staff-directory_table_row_title").first().text().trim();
    const email = extractEmailFromEl($row, $);
    const phone = extractPhoneFromEl($row, $);
    const bioLink = $row.find(".staff-directory_table_row_name a[href]").first().attr("href");
    const bioUrl = (!email && bioLink)
      ? (bioLink.startsWith("http") ? bioLink : (() => { try { return new URL(bioLink, baseUrl).toString(); } catch { return null; } })())
      : null;
    results.push({ name, title, email, phone, bioUrl });
  });
  return results;
}

export const genericParser: Parser = (html, baseUrl) => {
  const $ = cheerio.load(html);

  // WordPress staff-directory (LSU, SC, Kentucky, Vanderbilt…)
  let results = parseWordPressStaffDir($, baseUrl);
  if (results.length > 0) return results;

  results = parseTable($, baseUrl);
  if (results.length > 0) return results;

  results = parseByMailto($, baseUrl);
  if (results.length > 0) return results;

  return parseDL($);
};
