import "server-only";

import { topicCards as fallbackTopics } from "@/content/site";
import type { Topic } from "@/content/site";
import { searchPersonalizedNewsWithExa } from "@/lib/exa-news";
import { getTopics } from "@/lib/cms";

type DrafterStatus =
  | "posted"
  | "validation_failed"
  | "exa_empty"
  | "llm_failed"
  | "strapi_failed";

export type DrafterResult = {
  status: DrafterStatus;
  topicSlug: string;
  articleId: number | null;
  errorReason?: string;
};

type DraftJson = {
  title: string;
  summary: string;
  body: string;
  executiveSummary: string[];
  sourceNotes: { text: string; url: string }[];
};

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL ?? process.env.STRAPI_URL;
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;
const PROMPT_CACHE_KEY = "common-ground-drafter:v1";

const DRAFTER_SYSTEM_PROMPT = `
Common Ground is an advertisement-free public-interest news portal. Its
editorial rules are:

1. Headlines inform before they persuade. Never use fear-based framing,
   false urgency, or rhetorical devices designed to trigger clicks.
2. Every claim should be traceable to its origin. Prefer primary records,
   named interviews, and public documents over summaries.
3. Story placement reflects civic value, not engagement metrics.
4. Corrections are transparent and same-day. Acknowledge uncertainty
   explicitly — do not paper over gaps with confident language.

You are drafting a research lead for a staff editor. Your output is NOT
published as-is. The editor will verify every source and rewrite the
prose. Your job is to produce a structured starting point.

Produce a JSON object with EXACTLY this shape (no extra fields, no
markdown wrapper):

{
  "title": string (10-180 chars),
  "summary": string (1-3 sentences),
  "body": string (400-700 words of plain prose; HTML allowed only for <p> tags),
  "executiveSummary": string[] (3-5 short findings),
  "sourceNotes": { "text": string, "url": string }[]
}

CRITICAL RULES:

- Every URL in sourceNotes MUST be a URL present in the supplied Exa
  results. Do not invent URLs. Do not modify URL paths.
- Never claim a specific number, statistic, or named source that is not
  in the supplied Exa results.
- Use calm, factual, proportionate language. No drama adjectives.
- Treat readers as capable adults. Do not moralize, scold, or flatter.
- Short sentences. Active voice.
`.trim();

function normaliseBaseUrl(url: string) {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

function pickRandomTopic(topics: Topic[]): Topic | null {
  const eligible = topics.filter((topic) => topic.slug !== "music-arts");
  if (eligible.length === 0) return null;
  const index = Math.floor(Math.random() * eligible.length);
  return eligible[index];
}

function isDraftJsonShape(value: unknown): value is DraftJson {
  if (!value || typeof value !== "object") return false;
  const cast = value as Record<string, unknown>;
  if (typeof cast.title !== "string" || cast.title.length < 10 || cast.title.length > 200) {
    return false;
  }
  if (typeof cast.summary !== "string") return false;
  if (typeof cast.body !== "string" || cast.body.length < 300) return false;
  if (!Array.isArray(cast.executiveSummary)) return false;
  if (cast.executiveSummary.length < 3 || cast.executiveSummary.length > 5) {
    return false;
  }
  if (!cast.executiveSummary.every((bullet) => typeof bullet === "string")) {
    return false;
  }
  if (!Array.isArray(cast.sourceNotes) || cast.sourceNotes.length === 0) {
    return false;
  }
  if (
    !cast.sourceNotes.every((note) => {
      if (!note || typeof note !== "object") return false;
      const nCast = note as Record<string, unknown>;
      return typeof nCast.text === "string" && typeof nCast.url === "string";
    })
  ) {
    return false;
  }
  return true;
}

async function findStrapiTopicId(slug: string): Promise<number | null> {
  if (!STRAPI_URL || !STRAPI_API_TOKEN) return null;

  const url = `${normaliseBaseUrl(STRAPI_URL)}/api/topics?filters[slug][$eq]=${encodeURIComponent(slug)}&pagination[limit]=1`;
  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { data?: Array<{ id?: number }> };
    return data.data?.[0]?.id ?? null;
  } catch {
    return null;
  }
}

async function findStrapiAuthorIdBySlug(slug: string): Promise<number | null> {
  if (!STRAPI_URL || !STRAPI_API_TOKEN) return null;

  const url = `${normaliseBaseUrl(STRAPI_URL)}/api/authors?filters[slug][$eq]=${encodeURIComponent(slug)}&pagination[limit]=1`;
  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { data?: Array<{ id?: number }> };
    return data.data?.[0]?.id ?? null;
  } catch {
    return null;
  }
}

export async function runDrafterPipeline(): Promise<DrafterResult> {
  if (!OPENAI_API_KEY || !STRAPI_URL || !STRAPI_API_TOKEN) {
    return {
      status: "strapi_failed",
      topicSlug: "",
      articleId: null,
      errorReason: "missing env: OPENAI_API_KEY, STRAPI_URL, or STRAPI_API_TOKEN",
    };
  }

  // 1. Topic selection (random, excluding music-arts)
  const topics = await getTopics().catch(() => fallbackTopics);
  const topic = pickRandomTopic(topics);
  if (!topic) {
    return { status: "exa_empty", topicSlug: "", articleId: null, errorReason: "no eligible topics" };
  }

  // 2. Exa retrieval
  const exaResults = await searchPersonalizedNewsWithExa(
    topic.name,
    {
      name: "AI drafter",
      topicSlugs: [topic.slug],
      storyTypes: ["reporting", "analysis", "opinion"],
      maxReadMinutes: null,
      includeKeywords: [],
      excludeKeywords: [],
      minSourceCount: 1,
      onlyFeatured: false,
      deliveryStyle: "mixed",
    },
    topics,
  );

  if (exaResults.length === 0) {
    return { status: "exa_empty", topicSlug: topic.slug, articleId: null };
  }

  const allowedUrls = new Set(exaResults.map((result) => result.url));

  // 3. LLM call
  const llmUserMessage = JSON.stringify({
    topic: { slug: topic.slug, name: topic.name, focus: topic.editorialFocus },
    exaResults: exaResults.slice(0, 10).map((result) => ({
      title: result.title,
      url: result.url,
      summary: result.summary,
      publisher: result.publisher,
      publishedOn: result.publishedOn,
    })),
  });

  let llmResponse: { choices?: Array<{ message?: { content?: string } }> };
  try {
    const response = await fetch(`${normaliseBaseUrl(OPENAI_BASE_URL)}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.3,
        max_tokens: 3000,
        prompt_cache_key: PROMPT_CACHE_KEY,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: DRAFTER_SYSTEM_PROMPT },
          { role: "user", content: llmUserMessage },
        ],
      }),
    });

    if (!response.ok) {
      return {
        status: "llm_failed",
        topicSlug: topic.slug,
        articleId: null,
        errorReason: `OpenAI HTTP ${response.status}`,
      };
    }

    llmResponse = await response.json();
  } catch (error) {
    return {
      status: "llm_failed",
      topicSlug: topic.slug,
      articleId: null,
      errorReason: error instanceof Error ? error.message : "network",
    };
  }

  const rawContent = llmResponse.choices?.[0]?.message?.content;
  if (!rawContent) {
    return { status: "llm_failed", topicSlug: topic.slug, articleId: null, errorReason: "empty response" };
  }

  // 4. Validation
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    return {
      status: "validation_failed",
      topicSlug: topic.slug,
      articleId: null,
      errorReason: "JSON parse failed",
    };
  }

  if (!isDraftJsonShape(parsed)) {
    return {
      status: "validation_failed",
      topicSlug: topic.slug,
      articleId: null,
      errorReason: "shape mismatch",
    };
  }

  // URL whitelist: every sourceNote URL must be in the Exa results.
  const invalidUrls = parsed.sourceNotes
    .map((note) => note.url)
    .filter((url) => !allowedUrls.has(url));

  if (invalidUrls.length > 0) {
    return {
      status: "validation_failed",
      topicSlug: topic.slug,
      articleId: null,
      errorReason: `hallucinated URLs: ${invalidUrls.slice(0, 3).join(", ")}`,
    };
  }

  // 5. Strapi post
  const topicId = await findStrapiTopicId(topic.slug);
  const authorId = await findStrapiAuthorIdBySlug("ai-drafter");

  if (!topicId || !authorId) {
    return {
      status: "strapi_failed",
      topicSlug: topic.slug,
      articleId: null,
      errorReason: !topicId ? "topic id missing in Strapi" : "ai-drafter author missing in Strapi",
    };
  }

  const now = new Date();
  const stamp = now.toISOString().replace(/[-:]/g, "").slice(0, 13);
  const slug = `ai-draft-${topic.slug}-${stamp}`;

  const articleBody = {
    data: {
      title: parsed.title,
      slug,
      summary: parsed.summary,
      readTime: `${Math.max(3, Math.round(parsed.body.length / 1100))} min read`,
      storyType: "reporting",
      body: parsed.body,
      sources: parsed.sourceNotes.map((note) => note.text),
      featured: false,
      deepDive: false,
      format: "data-led",
      executiveSummary: parsed.executiveSummary.map((text) => ({ text })),
      sourceNotes: parsed.sourceNotes.map((note) => ({ text: note.text, url: note.url })),
      publishedOn: now.toISOString(),
      author: authorId,
      topic: topicId,
      publishedAt: null,
    },
  };

  try {
    const response = await fetch(`${normaliseBaseUrl(STRAPI_URL)}/api/articles`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${STRAPI_API_TOKEN}`,
      },
      body: JSON.stringify(articleBody),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return {
        status: "strapi_failed",
        topicSlug: topic.slug,
        articleId: null,
        errorReason: `Strapi HTTP ${response.status}: ${text.slice(0, 200)}`,
      };
    }

    const data = (await response.json()) as { data?: { id?: number } };
    return {
      status: "posted",
      topicSlug: topic.slug,
      articleId: data.data?.id ?? null,
    };
  } catch (error) {
    return {
      status: "strapi_failed",
      topicSlug: topic.slug,
      articleId: null,
      errorReason: error instanceof Error ? error.message : "network",
    };
  }
}
