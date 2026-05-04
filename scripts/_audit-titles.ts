import axios from "axios";
import * as cheerio from "cheerio";
const UA = "SpotrBot/0.1";

async function main() {
  const r = await axios.get<string>("https://lsusports.net/staff-directory?category=football", {
    headers: { "User-Agent": UA }, responseType: "text", timeout: 15000
  });
  const $ = cheerio.load(r.data);

  // Find first non-separator row
  let found = false;
  $(".staff-directory__table tr").each((_, row) => {
    if (found) return;
    const cells = $(row).find("td");
    if (cells.length < 2) return;
    const text = $(row).text().replace(/\s+/g, " ").trim();
    if (text.length < 5) return;
    console.log("Row HTML:", $(row).html()?.slice(0, 800));
    found = true;
  });

  // Also check what the email/phone cells look like
  const emailLinks = $(".staff-directory__table a[href^='mailto:']").slice(0, 3);
  emailLinks.each((_, el) => {
    const $row = $(el).closest("tr");
    console.log("\nEmail row:", $row.html()?.slice(0, 500));
  });
}
main().catch(console.error);
