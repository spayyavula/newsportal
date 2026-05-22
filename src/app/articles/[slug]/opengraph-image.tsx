import { ImageResponse } from "next/og";
import { OgCard, OG_CONTENT_TYPE, OG_SIZE } from "@/components/og-card";
import { getArticleBySlug } from "@/lib/cms";

export const runtime = "nodejs";
export const contentType = OG_CONTENT_TYPE;
export const size = OG_SIZE;
export const alt = "Common Ground article";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function ArticleOgImage({ params }: Props) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article) {
    return new ImageResponse(
      <OgCard title="Common Ground" subtitle="Article not found." />,
      { ...OG_SIZE },
    );
  }

  return new ImageResponse(
    (
      <OgCard
        kicker={article.topic.name}
        title={article.title}
        subtitle={`By ${article.author.name}`}
      />
    ),
    { ...OG_SIZE },
  );
}
