import type { Article, StoryType, Topic } from "@/content/site";
import type {
  AssistantCitation,
  ExternalNewsResult,
  NewsAssistantProfile,
} from "@/lib/reader-types";

export type NewsAssistantRequest = {
  message: string;
  profile: NewsAssistantProfile;
  excludeSlugs?: string[];
  excludeUrls?: string[];
};

export type AssistantRecommendation = {
  article: Article;
  score: number;
  reasons: string[];
};

export type NewsAssistantResponse = {
  reply: string;
  recommendations: AssistantRecommendation[];
  externalResults: ExternalNewsResult[];
  suggestedPrompts: string[];
  summaryLabel: string;
  citations: AssistantCitation[];
  usedLlm: boolean;
  model: string | null;
};

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "for",
  "from",
  "how",
  "into",
  "more",
  "news",
  "show",
  "tell",
  "that",
  "the",
  "them",
  "they",
  "this",
  "what",
  "with",
  "would",
  "about",
  "looking",
  "need",
  "want",
  "give",
  "latest",
]);

function normalizePhrase(value: string) {
  return value.trim().toLowerCase();
}

function uniquePhrases(values: string[]) {
  return [...new Set(values.map(normalizePhrase).filter(Boolean))];
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, " ");
}

function parseReadMinutes(readTime: string) {
  const match = readTime.match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

function tokenizeMessage(message: string) {
  return uniquePhrases(
    message
      .split(/[^a-zA-Z0-9]+/)
      .map((token) => token.trim())
      .filter((token) => token.length > 2 && !STOP_WORDS.has(token.toLowerCase())),
  );
}

function articleSearchText(article: Article) {
  return normalizePhrase(
    [
      article.title,
      article.summary,
      article.topic.name,
      article.topic.description,
      article.author.name,
      article.author.role,
      article.author.bio,
      article.author.coverageAreas.join(" "),
      article.sources.join(" "),
      stripHtml(article.body),
      article.contentBlocks
        .map((block) => {
          if (block.type === "section") {
            return `${block.heading} ${stripHtml(block.body)}`;
          }

          if (block.type === "pull-quote") {
            return `${block.quote} ${block.attribution} ${block.role ?? ""}`;
          }

          return `${block.title} ${stripHtml(block.body)} ${block.keyPoints.join(" ")}`;
        })
        .join(" "),
    ].join(" "),
  );
}

function matchesAnyPhrase(text: string, phrases: string[]) {
  return phrases.some((phrase) => text.includes(phrase));
}

function buildReasonList(article: Article, profile: NewsAssistantProfile, queryTerms: string[]) {
  const reasons: string[] = [];
  const readMinutes = parseReadMinutes(article.readTime);

  if (profile.topicSlugs.includes(article.topic.slug)) {
    reasons.push(`matches your ${article.topic.name} preference`);
  }

  if (profile.storyTypes.includes(article.storyType)) {
    reasons.push(`fits your ${article.storyType} preference`);
  }

  if (typeof readMinutes === "number" && profile.maxReadMinutes && readMinutes <= profile.maxReadMinutes) {
    reasons.push(`stays within your ${profile.maxReadMinutes}-minute reading limit`);
  }

  if (article.sources.length >= profile.minSourceCount) {
    reasons.push(`includes ${article.sources.length} cited sources`);
  }

  if (queryTerms.length > 0) {
    const text = articleSearchText(article);
    const matched = queryTerms.filter((term) => text.includes(term));

    if (matched.length > 0) {
      reasons.push(`responds to your request for ${matched.slice(0, 3).join(", ")}`);
    }
  }

  if (reasons.length === 0) {
    reasons.push("aligns with your saved briefing profile");
  }

  return reasons.slice(0, 3);
}

function passesHardFilters(article: Article, profile: NewsAssistantProfile) {
  if (profile.topicSlugs.length > 0 && !profile.topicSlugs.includes(article.topic.slug)) {
    return false;
  }

  if (profile.storyTypes.length > 0 && !profile.storyTypes.includes(article.storyType)) {
    return false;
  }

  if (profile.onlyFeatured && !article.featured) {
    return false;
  }

  if (article.sources.length < profile.minSourceCount) {
    return false;
  }

  const readMinutes = parseReadMinutes(article.readTime);

  if (
    profile.maxReadMinutes &&
    typeof readMinutes === "number" &&
    readMinutes > profile.maxReadMinutes
  ) {
    return false;
  }

  const text = articleSearchText(article);

  if (profile.excludeKeywords.length > 0 && matchesAnyPhrase(text, profile.excludeKeywords)) {
    return false;
  }

  if (profile.includeKeywords.length > 0 && !matchesAnyPhrase(text, profile.includeKeywords)) {
    return false;
  }

  return true;
}

export function sanitizeProfile(profile: Partial<NewsAssistantProfile> | null | undefined) {
  const sanitized: NewsAssistantProfile = {
    name: typeof profile?.name === "string" ? profile.name.trim().slice(0, 60) : "",
    topicSlugs: uniquePhrases(Array.isArray(profile?.topicSlugs) ? profile.topicSlugs : []),
    storyTypes: (Array.isArray(profile?.storyTypes) ? profile.storyTypes : []).filter(
      (value): value is StoryType =>
        value === "reporting" || value === "analysis" || value === "opinion",
    ),
    maxReadMinutes:
      typeof profile?.maxReadMinutes === "number" && Number.isFinite(profile.maxReadMinutes)
        ? Math.max(1, Math.min(60, Math.round(profile.maxReadMinutes)))
        : null,
    includeKeywords: uniquePhrases(
      Array.isArray(profile?.includeKeywords) ? profile.includeKeywords : [],
    ),
    excludeKeywords: uniquePhrases(
      Array.isArray(profile?.excludeKeywords) ? profile.excludeKeywords : [],
    ),
    minSourceCount:
      typeof profile?.minSourceCount === "number" && Number.isFinite(profile.minSourceCount)
        ? Math.max(0, Math.min(10, Math.round(profile.minSourceCount)))
        : 0,
    onlyFeatured: Boolean(profile?.onlyFeatured),
    deliveryStyle:
      profile?.deliveryStyle === "briefing" ||
      profile?.deliveryStyle === "deep-dive" ||
      profile?.deliveryStyle === "mixed"
        ? profile.deliveryStyle
        : "mixed",
  };

  return sanitized;
}

export function rankPersonalizedArticles(
  articles: Article[],
  rawProfile: Partial<NewsAssistantProfile> | null | undefined,
  message: string,
) {
  const profile = sanitizeProfile(rawProfile);
  const queryTerms = tokenizeMessage(message);

  return articles
    .filter((article) => passesHardFilters(article, profile))
    .map((article) => {
      const text = articleSearchText(article);
      const readMinutes = parseReadMinutes(article.readTime);
      let score = 0;

      if (profile.topicSlugs.includes(article.topic.slug)) {
        score += 35;
      }

      if (profile.storyTypes.includes(article.storyType)) {
        score += 20;
      }

      if (article.featured) {
        score += 8;
      }

      if (article.sources.length >= profile.minSourceCount) {
        score += 6 + article.sources.length;
      }

      if (typeof readMinutes === "number" && profile.maxReadMinutes) {
        score += Math.max(0, 12 - Math.abs(profile.maxReadMinutes - readMinutes));
      }

      if (profile.includeKeywords.length > 0) {
        score += profile.includeKeywords.filter((phrase) => text.includes(phrase)).length * 15;
      }

      if (queryTerms.length > 0) {
        score += queryTerms.filter((term) => text.includes(term)).length * 10;
      }

      if (profile.deliveryStyle === "briefing" && typeof readMinutes === "number") {
        score += Math.max(0, 8 - readMinutes);
      }

      if (profile.deliveryStyle === "deep-dive" && typeof readMinutes === "number") {
        score += readMinutes;
      }

      score += Math.max(
        0,
        20 - Math.floor((Date.now() - new Date(article.publishedOn).getTime()) / 86400000),
      );

      return {
        article,
        score,
        reasons: buildReasonList(article, profile, queryTerms),
      };
    })
    .sort((left, right) => right.score - left.score);
}

function describeFilters(profile: NewsAssistantProfile, topics: Topic[]) {
  const parts: string[] = [];

  if (profile.topicSlugs.length > 0) {
    const topicNames = topics
      .filter((topic) => profile.topicSlugs.includes(topic.slug))
      .map((topic) => topic.name);

    if (topicNames.length > 0) {
      parts.push(`topics: ${topicNames.join(", ")}`);
    }
  }

  if (profile.storyTypes.length > 0) {
    parts.push(`story types: ${profile.storyTypes.join(", ")}`);
  }

  if (profile.maxReadMinutes) {
    parts.push(`read time under ${profile.maxReadMinutes} minutes`);
  }

  if (profile.minSourceCount > 0) {
    parts.push(`at least ${profile.minSourceCount} sources`);
  }

  if (profile.includeKeywords.length > 0) {
    parts.push(`must include ${profile.includeKeywords.join(", ")}`);
  }

  if (profile.excludeKeywords.length > 0) {
    parts.push(`excluding ${profile.excludeKeywords.join(", ")}`);
  }

  if (profile.onlyFeatured) {
    parts.push("featured stories only");
  }

  return parts;
}

export function buildAssistantReply(
  recommendations: AssistantRecommendation[],
  rawProfile: Partial<NewsAssistantProfile> | null | undefined,
  message: string,
  topics: Topic[],
) {
  const profile = sanitizeProfile(rawProfile);
  const readerName = profile.name || "there";
  const filters = describeFilters(profile, topics);

  if (recommendations.length === 0) {
    return [
      `I couldn't find published stories that match your current profile, ${readerName}.`,
      filters.length > 0
        ? `Your active filters are ${filters.join("; ")}. Try widening one of them or removing a blocked keyword.`
        : "Try selecting at least one topic or entering a question with a concrete issue, place, or keyword.",
      message.trim()
        ? `I also checked your request for "${message.trim()}" against the current article set, but nothing cleared every filter.`
        : "Use the prompt box to ask for a briefing such as climate policy, housing, or wage coverage.",
    ].join(" ");
  }

  const lead = recommendations[0];
  const intro = profile.name
    ? `${profile.name}, here is your personalized news brief.`
    : "Here is your personalized news brief.";

  const filterText = filters.length > 0 ? ` I applied ${filters.join("; ")}.` : "";
  const messageText = message.trim()
    ? ` I also weighted your request for "${message.trim()}".`
    : "";

  const recommendationText = recommendations
    .slice(0, 3)
    .map(
      (entry, index) =>
        `${index + 1}. ${entry.article.title} because it ${entry.reasons.join(", ")}.`,
    )
    .join(" ");

  return `${intro}${filterText}${messageText} Start with ${lead.article.title}. ${recommendationText}`;
}

export function buildSuggestedPrompts(profile: Partial<NewsAssistantProfile>, topics: Topic[]) {
  const sanitized = sanitizeProfile(profile);
  const preferredTopics = topics.filter((topic) => sanitized.topicSlugs.includes(topic.slug));

  if (preferredTopics.length > 0) {
    return preferredTopics.slice(0, 3).map((topic) => `Show me the latest ${topic.name} stories with strong sourcing.`);
  }

  return [
    "Show me the most useful reporting for this week.",
    "Which stories explain public policy changes without sensational framing?",
    "Give me a short brief on the most evidence-heavy coverage right now.",
  ];
}

export function buildExternalAssistantReply(
  results: ExternalNewsResult[],
  rawProfile: Partial<NewsAssistantProfile> | null | undefined,
  message: string,
  topics: Topic[],
) {
  const profile = sanitizeProfile(rawProfile);
  const readerName = profile.name || "there";
  const topicNames = topics
    .filter((topic) => profile.topicSlugs.includes(topic.slug))
    .map((topic) => topic.name);

  if (results.length === 0) {
    return `I couldn't find Exa news results that match your current filters, ${readerName}. Try widening your keywords or selected topics.`;
  }

  const lead = results[0];
  const filters = [
    topicNames.length > 0 ? `topics: ${topicNames.join(", ")}` : "",
    profile.includeKeywords.length > 0 ? `must include ${profile.includeKeywords.join(", ")}` : "",
    profile.excludeKeywords.length > 0 ? `excluding ${profile.excludeKeywords.join(", ")}` : "",
    profile.storyTypes.length > 0 ? `story types: ${profile.storyTypes.join(", ")}` : "",
  ].filter(Boolean);

  const recap = results
    .slice(0, 3)
    .map((item, index) => `${index + 1}. ${item.title} because it ${item.reasons.join(", ")}.`)
    .join(" ");

  return `${readerName === "there" ? "Here" : `${readerName}, here`} is your Exa-powered news brief.${filters.length > 0 ? ` I applied ${filters.join("; ")}.` : ""}${message.trim() ? ` I searched for "${message.trim()}" across recent news results.` : ""} Start with ${lead.title}. ${recap}`;
}