import { Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod/v3";

export async function main({
  stagehand,
  url,
}: {
  stagehand: Stagehand;
  url: string;
}) {
  const page = stagehand.context.pages()[0];
  await page.goto(url);

  // Try to extract the sitemap by finding all navigation links on the page
  const sitemap = await stagehand.extract(
    "Extract all navigation links and important page links visible on this page. Include the link text/label and the URL href for each link.",
    z.object({
      links: z.array(
        z.object({
          label: z.string(),
          href: z.string(),
        })
      ),
    })
  );

  console.log("=== SITEMAP FOR " + url + " ===");
  console.log(JSON.stringify(sitemap, null, 2));
  console.log("=== END SITEMAP ===");

  return sitemap;
}
