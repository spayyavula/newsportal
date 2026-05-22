import { ImageResponse } from "next/og";
import { OgCard, OG_CONTENT_TYPE, OG_SIZE } from "@/components/og-card";
import { getHomepageData } from "@/lib/cms";

export const runtime = "nodejs";
export const contentType = OG_CONTENT_TYPE;
export const size = OG_SIZE;
export const alt = "Common Ground — calm, source-linked, public-interest news";

export default async function HomepageOgImage() {
  const { anchorArticle } = await getHomepageData();

  return new ImageResponse(
    (
      <OgCard
        title="Common Ground"
        subtitle={
          anchorArticle?.title ??
          "Advertisement-free reporting for public life."
        }
      />
    ),
    { ...OG_SIZE },
  );
}
