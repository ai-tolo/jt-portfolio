// One-shot verification that NOTION_TOKEN can read the Case Studies data source.
// Run with: node --env-file=.env scripts/verify-notion.mjs

import { Client } from "@notionhq/client";

const DATA_SOURCE_ID = "e3863918-725e-4a5b-8968-ff133155c443";

if (!process.env.NOTION_TOKEN) {
  console.error("ERROR: NOTION_TOKEN is missing from .env");
  process.exit(1);
}

const notion = new Client({ auth: process.env.NOTION_TOKEN });

const res = await notion.dataSources.query({
  data_source_id: DATA_SOURCE_ID,
  filter: { property: "Status", select: { equals: "Published" } },
  sorts: [{ property: "Order", direction: "ascending" }],
});

console.log(`Found ${res.results.length} published case studies:\n`);
for (const page of res.results) {
  const p = page.properties;
  const name = p.Name?.title?.[0]?.plain_text ?? "(no name)";
  const slug = p.Slug?.rich_text?.[0]?.plain_text ?? "(no slug)";
  const order = p.Order?.number ?? "?";
  const subtitle = p.Subtitle?.rich_text?.[0]?.plain_text ?? "";
  console.log(`  ${order}. ${name}  ->  /case-studies/${slug}`);
  console.log(`     ${subtitle}\n`);
}
