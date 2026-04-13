#!/usr/bin/env node
/**
 * Utility script to analyze shop websites and suggest values for shops.json.
 *
 * Crawls shop websites and uses pattern matching to detect ethical values.
 * Use manage-data.html for Google Places lookups (requires browser API key).
 *
 * Usage:
 *   node scripts/populate-shop-data.js [--shop-id <id>] [--dry-run]
 *
 * Options:
 *   --shop-id <id>  Process only the shop with this ID
 *   --dry-run       Print suggestions without modifying shops.json
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { VALUES } from "../src/values.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SHOPS_PATH = path.join(__dirname, "../data/shops.json");

const KNOWN_VALUES = VALUES.map((v) => v.value);

async function fetchWebsiteContent(url) {
  try {
    const controller = new globalThis.AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; ShopDataBot/1.0; +https://github.com/example)",
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return null;
    }

    const html = await response.text();
    return extractTextFromHtml(html);
  } catch {
    return null;
  }
}

function extractTextFromHtml(html) {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 15000);
}

function analyzeContentForValues(content) {
  const suggestedValues = [];
  const reasons = {};

  const patterns = {
    lgbtq_friendly: [
      /lgbtq?\+?[- ]?(friendly|owned|welcoming)/i,
      /pride/i,
      /queer[- ]owned/i,
      /lgbtq?\+? community/i,
      /safe[- ]space/i,
    ],
    women_owned: [
      /woman[- ]owned/i,
      /women[- ]owned/i,
      /female[- ]owned/i,
      /founded by.*she/i,
      /founded by.*her/i,
    ],
    minority_owned: [
      /minority[- ]owned/i,
      /black[- ]owned/i,
      /asian[- ]owned/i,
      /latinx?[- ]owned/i,
      /hispanic[- ]owned/i,
      /bipoc[- ]owned/i,
    ],
    disabled_owned: [/disabled[- ]owned/i, /disability[- ]owned/i],
    veteran_owned: [/veteran[- ]owned/i, /vet[- ]owned/i, /military[- ]owned/i],
    small_business: [
      /small[- ]business/i,
      /independent[- ]business/i,
      /local[- ]business/i,
      /single[- ]location/i,
    ],
    non_profit: [/non[- ]?profit/i, /nonprofit/i, /501\s?\(c\)/i],
    community_owned: [
      /community[- ]owned/i,
      /co[- ]?op(erative)?/i,
      /cooperative/i,
    ],
    fair_labor: [/fair[- ]labor/i, /living[- ]wage/i, /fair[- ]wages?/i],
    fair_trade: [/fair[- ]trade/i, /ethically[- ]sourced/i],
    vegan_friendly: [
      /vegan[- ]friendly/i,
      /vegan[- ]options/i,
      /plant[- ]based/i,
    ],
    direct_trade: [/direct[- ]trade/i, /relationship[- ]coffee/i],
    locally_owned: [
      /locally[- ]owned/i,
      /local(ly)?[- ]roasted/i,
      /family[- ]owned/i,
      /independent(ly)?[- ]owned/i,
      /neighborhood[- ]caf[eé]/i,
      /our family/i,
      /since \d{4}/i,
    ],
    b_corp: [
      /b[- ]?corp/i,
      /certified[- ]b[- ]?corporation/i,
      /benefit corporation/i,
    ],
    vegetarian_friendly: [/vegetarian[- ]friendly/i, /vegetarian[- ]options/i],
    gluten_free: [/gluten[- ]free/i, /gf[- ]options/i],
    kosher: [/\bkosher\b/i, /kosher[- ]certified/i],
    halal: [/\bhalal\b/i, /halal[- ]certified/i],
    organic: [
      /\borganics?\b/i,
      /certified[- ]organic/i,
      /usda[- ]organic/i,
      /organic[- ]coffee/i,
    ],
  };

  for (const [value, regexes] of Object.entries(patterns)) {
    if (!KNOWN_VALUES.includes(value)) {
      continue;
    }
    for (const regex of regexes) {
      const match = content.match(regex);
      if (match) {
        if (!suggestedValues.includes(value)) {
          suggestedValues.push(value);
        }
        reasons[value] = reasons[value] || [];
        reasons[value].push(match[0]);
        break;
      }
    }
  }

  return { suggestedValues, reasons };
}

async function processShop(shop) {
  const result = {
    id: shop.id,
    name: shop.name,
    currentValues: shop.values || [],
    currentSummary: shop.summary || "",
    suggestedValues: [],
    valueReasons: {},
    websiteUrl: null,
    websiteFetched: false,
    errors: [],
  };

  const websiteUrl = shop.links?.[0]?.url;
  result.websiteUrl = websiteUrl || null;

  let websiteContent = "";

  if (websiteUrl) {
    console.log(`  Fetching ${websiteUrl}...`);
    try {
      websiteContent = (await fetchWebsiteContent(websiteUrl)) || "";
      result.websiteFetched = !!websiteContent;
      if (!websiteContent) {
        result.errors.push("Website returned empty or failed to fetch");
      }
    } catch (err) {
      result.errors.push(`Website fetch: ${err.message}`);
    }
  } else {
    result.errors.push("No website URL in links");
  }

  const combinedContent = [shop.name, shop.summary, websiteContent].join(" ");

  const analysis = analyzeContentForValues(combinedContent);
  result.suggestedValues = analysis.suggestedValues;
  result.valueReasons = analysis.reasons;

  return result;
}

function printShopResult(result) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Shop: ${result.name} (${result.id})`);
  console.log("=".repeat(60));

  if (result.websiteUrl) {
    console.log(`\nWebsite: ${result.websiteUrl}`);
    console.log(`Fetched: ${result.websiteFetched ? "Yes" : "No"}`);
  }

  if (result.errors.length > 0) {
    console.log("\nWarnings:");
    result.errors.forEach((e) => console.log(`  - ${e}`));
  }

  console.log(`\nCurrent values: [${result.currentValues.join(", ")}]`);
  console.log(`Suggested values: [${result.suggestedValues.join(", ")}]`);

  if (Object.keys(result.valueReasons).length > 0) {
    console.log("\nEvidence found:");
    for (const [value, evidence] of Object.entries(result.valueReasons)) {
      console.log(`  ${value}: "${evidence[0]}"`);
    }
  }

  const newValues = result.suggestedValues.filter(
    (v) => !result.currentValues.includes(v),
  );
  if (newValues.length > 0) {
    console.log(`\nNew values to add: [${newValues.join(", ")}]`);
  } else if (result.suggestedValues.length > 0) {
    console.log("\n(All suggested values already present)");
  }
}

function mergeValuesIntoShop(shop, result) {
  const updated = { ...shop };
  const newValues = result.suggestedValues.filter(
    (v) => !(shop.values || []).includes(v),
  );

  if (newValues.length > 0) {
    updated.values = [...(shop.values || []), ...newValues];
  }

  return updated;
}

async function main() {
  const args = globalThis.process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const shopIdIndex = args.indexOf("--shop-id");
  const targetShopId = shopIdIndex !== -1 ? args[shopIdIndex + 1] : null;

  console.log("Loading shops.json...");
  const shopsJson = await fs.readFile(SHOPS_PATH, "utf-8");
  const shops = JSON.parse(shopsJson);

  const shopsToProcess = targetShopId
    ? shops.filter((s) => s.id === targetShopId)
    : shops;

  if (targetShopId && shopsToProcess.length === 0) {
    console.error(`Error: No shop found with ID "${targetShopId}"`);
    globalThis.process.exit(1);
  }

  console.log(
    `Processing ${shopsToProcess.length} shop(s)${dryRun ? " (dry run)" : ""}...`,
  );

  const results = [];

  for (const shop of shopsToProcess) {
    const result = await processShop(shop);
    results.push(result);
    printShopResult(result);

    await new Promise((r) => setTimeout(r, 300));
  }

  if (!dryRun) {
    let modified = false;
    const updatedShops = shops.map((shop) => {
      const result = results.find((r) => r.id === shop.id);
      if (result) {
        const updated = mergeValuesIntoShop(shop, result);
        if (JSON.stringify(updated) !== JSON.stringify(shop)) {
          modified = true;
        }
        return updated;
      }
      return shop;
    });

    if (modified) {
      console.log("\nWriting updated shops.json...");
      await fs.writeFile(
        SHOPS_PATH,
        JSON.stringify(updatedShops, null, 2) + "\n",
      );
      console.log("Done!");
    } else {
      console.log("\nNo changes to write.");
    }
  } else {
    console.log("\n[Dry run - no changes written]");
  }

  const summary = {
    processed: results.length,
    withWebsite: results.filter((r) => r.websiteFetched).length,
    withNewValues: results.filter(
      (r) =>
        r.suggestedValues.filter((v) => !r.currentValues.includes(v)).length >
        0,
    ).length,
    withErrors: results.filter((r) => r.errors.length > 0).length,
  };

  console.log("\n" + "=".repeat(60));
  console.log("Summary:");
  console.log(`  Processed: ${summary.processed}`);
  console.log(`  With website fetched: ${summary.withWebsite}`);
  console.log(`  With new values suggested: ${summary.withNewValues}`);
  console.log(`  With warnings: ${summary.withErrors}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  globalThis.process.exit(1);
});
