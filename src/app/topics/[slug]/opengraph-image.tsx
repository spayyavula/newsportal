import { ImageResponse } from "next/og";
import { OgCard, OG_CONTENT_TYPE, OG_SIZE } from "@/components/og-card";
import { getTopicBySlug } from "@/lib/cms";

export const runtime = "nodejs";
export const contentType = OG_CONTENT_TYPE;
export const size = OG_SIZE;
export const alt = "Common Ground topic";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function TopicOgImage({ params }: Props) {
  const { slug } = await params;
  const topic = await getTopicBySlug(slug);

  if (!topic) {
    return new ImageResponse(
      <OgCard title="Common Ground" subtitle="Topic not found." />,
      { ...OG_SIZE },
    );
  }

  return new ImageResponse(
    (
      <OgCard
        kicker="Topic"
        title={topic.name}
        subtitle={topic.description}
      />
    ),
    { ...OG_SIZE },
  );
}
