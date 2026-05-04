import * as cheerio from "cheerio";
import type { Cheerio, CheerioAPI } from "cheerio";
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

function extractEmail($el: Cheerio<AnyNode>, $: CheerioAPI): string | null {
  const mailto = $el.find("a[href^='mailto:']").first();
  if (mailto.length) return mailto.attr("href")!.replace(/^mailto:/i, "").trim().toLowerCase();
  const cf = $el.find("[data-cfemail]").first();
  if (cf.length) return decodeCFEmail(cf.attr("data-cfemail")!).toLowerCase();
  const match = $el.text().match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
  if (match) return match[0].toLowerCase().trim();
  return null;
}

function extractPhone($el: Cheerio<AnyNode>, $: CheerioAPI): string | null {
  const tel = $el.find("a[href^='tel:']").first();
  if (tel.length) return tel.attr("href")!.replace(/^tel:/i, "").trim();
  return null;
}

function extractBioUrl($el: Cheerio<AnyNode>, $: CheerioAPI, baseUrl: string): string | null {
  const link = $el.find("a[href*='/coaches/'], a[href*='/staff/'], a[href*='/personnel/']").first();
  if (!link.length) return null;
  const href = link.attr("href");
  if (!href) return null;
  if (href.startsWith("http")) return href;
  try { return new URL(href, baseUrl).toString(); } catch { return null; }
}

export const prestoParser: Parser = (html, baseUrl) => {
  const $ = cheerio.load(html);
  const results: ParsedCoach[] = [];

  const cardSelectors = [
    ".c-personnel-item",
    ".c-coach-card",
    "[class*='c-personnel']",
    ".staff-list-item",
  ];

  let cards: Cheerio<AnyNode> | null = null;
  for (const sel of cardSelectors) {
    const found = $(sel);
    if (found.length > 0) { cards = found; break; }
  }

  if (!cards || cards.length === 0) return results;

  cards.each((_, el) => {
    const $el = $(el);
    const name = $el
      .find(".c-personnel-item__name, .c-coach-card__name, [class*='personnel__name'], [class*='coach-name']")
      .first().text().trim();
    const title = $el
      .find(".c-personnel-item__title, .c-coach-card__title, [class*='personnel__title'], [class*='coach-title']")
      .first().text().trim();
    if (!name) return;
    const email = extractEmail($el, $);
    const phone = extractPhone($el, $);
    const bioUrl = email ? null : extractBioUrl($el, $, baseUrl);
    results.push({ name, title, email, phone, bioUrl });
  });

  return results;
};

export function detectPresto(html: string): boolean {
  return /presto/i.test(html) || html.includes("c-personnel") || html.includes("wmtdigital");
}
