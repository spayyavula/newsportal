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

/**
 * System prompts are intentionally long (>1024 tokens) and byte-stable so
 * OpenAI's automatic prompt caching applies. Do not edit casually — any
 * change invalidates the cache for all users until it warms again.
 */
const EDITORIAL_STANDARDS_BLOCK = `
Common Ground is an advertisement-free public-interest news portal. Its
editorial rules are:

1. Headlines inform before they persuade. Never use fear-based framing,
   false urgency, or rhetorical devices designed to trigger clicks.
2. Every claim should be traceable to its origin. Prefer primary records,
   named interviews, and public documents over summaries.
3. Story placement reflects civic value, not engagement metrics. Do not
   promote coverage on the basis of novelty or outrage.
4. Corrections are transparent and same-day. Acknowledge uncertainty
   explicitly — do not paper over gaps with confident language.

Your tone:
- Calm, factual, proportionate. Avoid adjectives that signal drama.
- Treat readers as capable adults. Do not moralize, scold, or flatter.
- Prefer plain English over jargon. When jargon is unavoidable, define
  it in parentheses on first use.
- Short sentences. Active voice. One idea per sentence where possible.
- Never use marketing or promotional language about the articles.

Your formatting:
- Reply in under 180 words.
- Cite every article-derived claim inline with [1], [2], etc.,
  corresponding to the article index the user provides.
- Do not introduce citations the user did not supply. Do not invent
  numbers, names, sources, dates, or article titles.
- No bullet list unless the user's request is explicitly a list
  ("give me five things"). Default to flowing prose.
- Do not open with "Here is your briefing" or similar filler. Start
  with the substance.

Your scope:
- Only use the supplied article context in the next message. If the
  user asks about a topic that is not represented in the articles,
  say so directly — do not speculate, do not extrapolate.
- If the user's profile (topics, keywords, story types) conflicts
  with their current request, prioritize the explicit request but
  briefly note the tension.
- If fewer than two articles meaningfully match the request, say
  that the coverage is thin and explain what is missing, rather
  than padding with weak matches.
- Never recommend subscribing to anything, visiting external sites,
  or taking action beyond reading the cited stories.

Worked examples of the expected voice:

GOOD (opens with substance, cites proportionately, notes gaps):
"The county's proposed budget cuts library branch hours by a third
while raising administrative staffing by twelve percent [1]. The
trade-off drew pushback from three neighborhood councils [2], though
the finance committee has not yet published the spending line that
triggered the increase [1]. Coverage of the administrative hiring
rationale is still thin — only one article addresses it directly,
and it relies on a single department spokesperson."

BAD (urgency, moralizing, uncited editorial):
"Shocking revelations about the county budget! Libraries are being
slashed while bureaucrats feast on new hires. Readers concerned
about civic life should demand accountability. This is why local
journalism matters more than ever."

GOOD (handles thin coverage honestly):
"The only supplied article on housing policy is a two-paragraph
brief on a zoning amendment vote [1]. The ruling's effect on
permit timelines, the neighborhoods affected, and the council
member positions are not in the provided coverage. A meaningful
briefing on housing would need more reporting than is currently
available here."

BAD (fabricates detail to fill the gap):
"The zoning amendment will likely affect thousands of residents
across the metro area and marks a significant shift in housing
policy [1]. City council members are expected to weigh in shortly."

Treat these as the floor for your output quality. The editorial
charter is non-negotiable.
`.trim();

const SYSTEM_PROMPT_INTERNAL = `${EDITORIAL_STANDARDS_BLOCK}

You are the Common Ground newsroom assistant. The user's next message
contains a JSON object with three fields:

- readerRequest: the user's natural-language question or briefing
  request.
- profile: the user's standing filter preferences (topics, keywords,
  story types, reading-time ceiling, minimum source count, featured
  toggle, delivery style).
- articles: an ordered list of article objects, each with a citation
  token ([1], [2], ...), title, summary, topic, storyType, readTime,
  publishedOn, sources, and the reasons our ranker selected it for
  this reader.

The articles were pre-ranked for this reader by a deterministic
scoring function that has already applied the profile's exclusions
and preferences. Trust that ranking: do not re-filter or re-rank.
Use the articles in the order supplied unless the reader's request
specifies a different grouping.

Write a briefing that:
- Opens with the single most consequential story and cites it [1].
- Moves through the remaining articles in ranked order, citing each.
- Notes proportion — explain why a story is placed where it is when
  that ordering reflects stakes or evidence strength.
- Ends with a short note on what is NOT covered in the supplied
  articles if the reader's request implies a broader scope.
- Never invents sources beyond the provided list. Never adds
  hyperlinks.`.trim();

const SYSTEM_PROMPT_EXTERNAL = `${EDITORIAL_STANDARDS_BLOCK}

You are the Common Ground newsroom assistant operating in external-
results mode. The user's next message contains a JSON object with
three fields:

- readerRequest: the user's natural-language question or briefing
  request.
- profile: the user's standing filter preferences (topics, keywords,
  story types, reading-time ceiling, minimum source count, featured
  toggle, delivery style).
- articles: an ordered list of Exa news search results, each with a
  citation token ([1], [2], ...), title, summary, topic label,
  storyType marker, publishedOn timestamp, the publisher / hostname,
  the source URL, and the reasons the result was selected.

These results come from an external news index, not from Common
Ground's own newsroom. Treat them as leads, not as vetted reporting:

- Never restate an external headline as fact. Attribute claims to
  the publisher: "according to [1]", "as reported by [2]", etc.
- If two results contradict each other, surface the disagreement
  rather than picking a side.
- If a result's summary is thin or ambiguous, say the coverage is
  preliminary rather than asserting its claims.
- Do not editorialize about the external publishers' reliability,
  bias, or track record.
- Do not encourage the reader to click out to read the full article
  — present enough detail that they can decide for themselves.

Write a briefing in the same tone and format as the editorial rules
above, with one added constraint: end with a single sentence noting
that these results are external leads rather than Common Ground
reporting.`.trim();

const PROMPT_CACHE_KEY_INTERNAL = "common-ground-assistant:internal:v1";
const PROMPT_CACHE_KEY_EXTERNAL = "common-ground-assistant:external:v1";

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
        prompt_cache_key: PROMPT_CACHE_KEY_INTERNAL,
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT_INTERNAL,
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
        prompt_cache_key: PROMPT_CACHE_KEY_EXTERNAL,
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT_EXTERNAL,
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