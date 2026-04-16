import "server-only";

import type { Topic } from "@/content/site";
import type { ExternalNewsResult, NewsAssistantProfile } from "@/lib/reader-types";

type ExaSearchResponse = {
  results?: Array<Record<string, unknown>>;
};

const EXA_API_KEY = process.env.EXA_API_KEY;
const EXA_BASE_URL = process.env.EXA_BASE_URL ?? "https://api.exa.ai";

function normalizeBaseUrl(url: string) {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

function normalizePhrase(value: string) {
  return value.trim().toLowerCase();
}

function buildSearchQuery(message: string, profile: NewsAssistantProfile, topics: Topic[]) {
  const selectedTopics = topics
    .filter((topic) => profile.topicSlugs.includes(topic.slug))
    .map((topic) => topic.name);

  const segments = [
    message.trim() || "latest public-interest news",
    selectedTopics.length > 0 ? `topics: ${selectedTopics.join(", ")}` : "",
    profile.includeKeywords.length > 0
      ? `must include ${profile.includeKeywords.join(", ")}`
      : "",
    profile.excludeKeywords.length > 0
      ? `exclude ${profile.excludeKeywords.join(", ")}`
      : "",
    profile.storyTypes.length > 0
      ? `focus on ${profile.storyTypes.join(", ")} coverage`
      : "",
    "recent news articles",
  ];

  return segments.filter(Boolean).join("; ");
}

function buildReasons(
  resultText: string,
  publisher: string,
  profile: NewsAssistantProfile,
  topicNames: string[],
) {
  const reasons: string[] = [];

  const matchedTopic = topicNames.find((topic) => resultText.includes(topic.toLowerCase()));

  if (matchedTopic) {
    reasons.push(`matches your ${matchedTopic} interest`);
  }

  const matchedKeywords = profile.includeKeywords.filter((keyword) => resultText.includes(keyword));

  if (matchedKeywords.length > 0) {
    reasons.push(`includes ${matchedKeywords.slice(0, 3).join(", ")}`);
  }

  if (publisher) {
    reasons.push(`published by ${publisher}`);
  }

  if (reasons.length === 0) {
    reasons.push("aligned with your personalized Exa query");
  }

  return reasons.slice(0, 3);
}

function passesProfileFilters(text: string, profile: NewsAssistantProfile) {
  const normalized = normalizePhrase(text);

  if (
    profile.includeKeywords.length > 0 &&
    !profile.includeKeywords.some((keyword) => normalized.includes(keyword))
  ) {
    return false;
  }

  if (
    profile.excludeKeywords.length > 0 &&
    profile.excludeKeywords.some((keyword) => normalized.includes(keyword))
  ) {
    return false;
  }

  return true;
}

function summarizeResult(entry: Record<string, unknown>) {
  const snippets = [entry.summary, entry.text, entry.snippet]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.replace(/\s+/g, " ").trim());

  return snippets[0]?.slice(0, 240) ?? "Open the article for the full report.";
}

export function hasExaConfig() {
  return Boolean(EXA_API_KEY);
}

export async function searchPersonalizedNewsWithExa(
  message: string,
  profile: NewsAssistantProfile,
  topics: Topic[],
) {
  if (!EXA_API_KEY) {
    return [] as ExternalNewsResult[];
  }

  const selectedTopicNames = topics
    .filter((topic) => profile.topicSlugs.includes(topic.slug))
    .map((topic) => topic.name);

  try {
    const response = await fetch(`${normalizeBaseUrl(EXA_BASE_URL)}/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": EXA_API_KEY,
      },
      body: JSON.stringify({
        query: buildSearchQuery(message, profile, topics),
        category: "news",
        type: "auto",
        numResults: 15,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as ExaSearchResponse;

    return (data.results ?? [])
      .map((entry) => {
        const title = typeof entry.title === "string" ? entry.title : null;
        const url = typeof entry.url === "string" ? entry.url : null;
        const publishedOn =
          typeof entry.publishedDate === "string"
            ? entry.publishedDate
            : typeof entry.published_at === "string"
              ? entry.published_at
              : new Date().toISOString();
        const publisher =
          typeof entry.author === "string"
            ? entry.author
            : typeof entry.siteName === "string"
              ? entry.siteName
              : typeof entry.hostname === "string"
                ? entry.hostname
                : "External source";
        const score = typeof entry.score === "number" ? entry.score : 0;

        if (!title || !url) {
          return null;
        }

        const summary = summarizeResult(entry);
        const searchable = `${title} ${summary} ${publisher}`;

        if (!passesProfileFilters(searchable, profile)) {
          return null;
        }

        return {
          title,
          url,
          publishedOn,
          summary,
          publisher,
          score,
          reasons: buildReasons(searchable.toLowerCase(), publisher, profile, selectedTopicNames),
        } satisfies ExternalNewsResult;
      })
      .filter((item): item is ExternalNewsResult => Boolean(item))
      .sort((left, right) => right.score - left.score);
  } catch {
    return [];
  }
}