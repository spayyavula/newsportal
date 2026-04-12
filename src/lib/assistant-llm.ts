import "server-only";

import type { AssistantRecommendation } from "@/lib/news-assistant";
import type {
  AssistantCitation,
  ExternalNewsResult,
  NewsAssistantProfile,
} from "@/lib/reader-types";

type LlmResult = {
  reply: string | null;
  citations: AssistantCitation[];
  usedLlm: boolean;
  model: string | null;
};

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";

function normalizeBaseUrl(url: string) {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

function buildCitation(recommendation: AssistantRecommendation, index: number): AssistantCitation {
  return {
    index,
    title: recommendation.article.title,
    slug: recommendation.article.slug,
    url: null,
    topic: recommendation.article.topic.name,
    publishedOn: recommendation.article.publishedOn,
    sourceCount: recommendation.article.sources.length,
    publisher: recommendation.article.author.name,
    sourceType: "internal",
    reasons: recommendation.reasons,
  };
}

function buildExternalCitation(result: ExternalNewsResult, index: number): AssistantCitation {
  return {
    index,
    title: result.title,
    slug: null,
    url: result.url,
    topic: "Exa news search",
    publishedOn: result.publishedOn,
    sourceCount: 1,
    publisher: result.publisher,
    sourceType: "external",
    reasons: result.reasons,
  };
}

function profileSummary(profile: NewsAssistantProfile) {
  return {
    name: profile.name,
    topicSlugs: profile.topicSlugs,
    storyTypes: profile.storyTypes,
    maxReadMinutes: profile.maxReadMinutes,
    includeKeywords: profile.includeKeywords,
    excludeKeywords: profile.excludeKeywords,
    minSourceCount: profile.minSourceCount,
    onlyFeatured: profile.onlyFeatured,
    deliveryStyle: profile.deliveryStyle,
  };
}

export async function generateLlmReply(
  message: string,
  profile: NewsAssistantProfile,
  recommendations: AssistantRecommendation[],
): Promise<LlmResult> {
  const citations = recommendations.slice(0, 4).map((item, index) => buildCitation(item, index + 1));

  if (!OPENAI_API_KEY || recommendations.length === 0) {
    return {
      reply: null,
      citations,
      usedLlm: false,
      model: null,
    };
  }

  try {
    const response = await fetch(`${normalizeBaseUrl(OPENAI_BASE_URL)}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content:
              "You are a newsroom assistant. Only use the supplied article context. Obey the reader profile exactly. Answer in under 180 words. When mentioning any article-derived claim or recommendation, cite it inline with [1], [2], etc. Never invent sources or articles beyond the provided list.",
          },
          {
            role: "user",
            content: JSON.stringify({
              readerRequest: message,
              profile: profileSummary(profile),
              articles: citations.map((citation, index) => ({
                citation: `[${index + 1}]`,
                title: recommendations[index]?.article.title,
                summary: recommendations[index]?.article.summary,
                topic: recommendations[index]?.article.topic.name,
                storyType: recommendations[index]?.article.storyType,
                readTime: recommendations[index]?.article.readTime,
                publishedOn: recommendations[index]?.article.publishedOn,
                sources: recommendations[index]?.article.sources,
                reasons: recommendations[index]?.reasons,
              })),
            }),
          },
        ],
      }),
    });

    if (!response.ok) {
      return {
        reply: null,
        citations,
        usedLlm: false,
        model: OPENAI_MODEL,
      };
    }

    const data = (await response.json()) as ChatCompletionResponse;
    const reply = data.choices?.[0]?.message?.content?.trim() ?? null;

    return {
      reply,
      citations,
      usedLlm: Boolean(reply),
      model: OPENAI_MODEL,
    };
  } catch {
    return {
      reply: null,
      citations,
      usedLlm: false,
      model: OPENAI_MODEL,
    };
  }
}

export async function generateLlmReplyFromExternalResults(
  message: string,
  profile: NewsAssistantProfile,
  results: ExternalNewsResult[],
): Promise<LlmResult> {
  const citations = results.slice(0, 4).map((item, index) => buildExternalCitation(item, index + 1));

  if (!OPENAI_API_KEY || results.length === 0) {
    return {
      reply: null,
      citations,
      usedLlm: false,
      model: null,
    };
  }

  try {
    const response = await fetch(`${normalizeBaseUrl(OPENAI_BASE_URL)}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content:
              "You are a newsroom assistant. Only use the supplied Exa search results. Obey the reader profile exactly. Answer in under 180 words. When recommending or summarizing a result, cite it inline with [1], [2], etc. Never invent articles beyond the provided list.",
          },
          {
            role: "user",
            content: JSON.stringify({
              readerRequest: message,
              profile: profileSummary(profile),
              articles: citations.map((citation, index) => ({
                citation: `[${index + 1}]`,
                title: results[index]?.title,
                summary: results[index]?.summary,
                topic: "Exa news search",
                storyType: "external-news",
                readTime: null,
                publishedOn: results[index]?.publishedOn,
                sources: [results[index]?.publisher],
                reasons: results[index]?.reasons,
                url: results[index]?.url,
              })),
            }),
          },
        ],
      }),
    });

    if (!response.ok) {
      return {
        reply: null,
        citations,
        usedLlm: false,
        model: OPENAI_MODEL,
      };
    }

    const data = (await response.json()) as ChatCompletionResponse;
    const reply = data.choices?.[0]?.message?.content?.trim() ?? null;

    return {
      reply,
      citations,
      usedLlm: Boolean(reply),
      model: OPENAI_MODEL,
    };
  } catch {
    return {
      reply: null,
      citations,
      usedLlm: false,
      model: OPENAI_MODEL,
    };
  }
}