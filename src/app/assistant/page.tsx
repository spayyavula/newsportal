import type { Metadata } from "next";
import { NewsAssistant } from "@/components/news-assistant";
import { getTopics } from "@/lib/cms";

export const metadata: Metadata = {
  title: "Assistant",
  description:
    "A personalized news chatbot that filters Common Ground reporting using reader-defined topics, formats, and custom keywords.",
};

export default async function AssistantPage() {
  const topics = await getTopics({ fallbackToLocal: true });

  return <NewsAssistant topics={topics} />;
}