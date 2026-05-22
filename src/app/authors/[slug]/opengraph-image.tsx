import { ImageResponse } from "next/og";
import { OgCard, OG_CONTENT_TYPE, OG_SIZE } from "@/components/og-card";
import { getAuthorBySlug } from "@/lib/cms";

export const runtime = "nodejs";
export const contentType = OG_CONTENT_TYPE;
export const size = OG_SIZE;
export const alt = "Common Ground author";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function AuthorOgImage({ params }: Props) {
  const { slug } = await params;
  const author = await getAuthorBySlug(slug);

  if (!author) {
    return new ImageResponse(
      <OgCard title="Common Ground" subtitle="Author not found." />,
      { ...OG_SIZE },
    );
  }

  return new ImageResponse(
    <OgCard kicker="Author" title={author.name} subtitle={author.role} />,
    { ...OG_SIZE },
  );
}
