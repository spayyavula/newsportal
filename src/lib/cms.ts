import "server-only";
import {
  articles as fallbackArticles,
  authors as fallbackAuthors,
  topicCards as fallbackTopics,
} from "@/content/site";
import type { Article, ArticleBlock, Author, Topic } from "@/content/site";

type StrapiListResponse<T> = {
  data: T[];
  meta?: {
    pagination?: {
      page: number;
      pageCount: number;
      pageSize: number;
      total: number;
    };
  };
};

type StrapiEntity = Record<string, unknown> & {
  id?: number | string;
  documentId?: string;
};

type QueryOptions = {
  preview?: boolean;
  fallbackToLocal?: boolean;
};

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL ?? process.env.STRAPI_URL;
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;

function normalizeBaseUrl(url: string) {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

async function fetchStrapi<T>(path: string, options: QueryOptions = {}): Promise<T | null> {
  if (!STRAPI_URL) {
    return null;
  }

  const url = `${normalizeBaseUrl(STRAPI_URL)}${path}`;

  try {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...(STRAPI_API_TOKEN ? { Authorization: `Bearer ${STRAPI_API_TOKEN}` } : {}),
      },
      ...(options.preview ? { cache: "no-store" as const } : { next: { revalidate: 60 } }),
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function unwrapRelation(value: unknown): StrapiEntity | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  if ("data" in (value as Record<string, unknown>)) {
    const data = (value as { data?: unknown }).data;

    if (Array.isArray(data)) {
      return (data[0] as StrapiEntity | undefined) ?? null;
    }

    return (data as StrapiEntity | null) ?? null;
  }

  return value as StrapiEntity;
}

function getFallbackTopic(slug: string) {
  return fallbackTopics.find((topic) => topic.slug === slug) ?? null;
}

function getFallbackAuthor(slug: string) {
  return fallbackAuthors.find((author) => author.slug === slug) ?? null;
}

function fallbackArticleBySlug(slug: string) {
  return fallbackArticles.find((article) => article.slug === slug) ?? null;
}

function mapArticleBlocks(value: unknown, fallbackBlocks: ArticleBlock[] = []): ArticleBlock[] {
  if (!Array.isArray(value)) {
    return fallbackBlocks;
  }

  const mapped = value
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const block = entry as Record<string, unknown>;

      if (block.__component === "editorial.section-block") {
        if (typeof block.heading === "string" && typeof block.body === "string") {
          return {
            type: "section" as const,
            heading: block.heading,
            body: block.body,
          };
        }
      }

      if (block.__component === "editorial.pull-quote") {
        if (typeof block.quote === "string" && typeof block.attribution === "string") {
          return {
            type: "pull-quote" as const,
            quote: block.quote,
            attribution: block.attribution,
            role: typeof block.role === "string" ? block.role : undefined,
          };
        }
      }

      if (block.__component === "editorial.explainer") {
        if (
          typeof block.title === "string" &&
          typeof block.body === "string" &&
          Array.isArray(block.keyPoints)
        ) {
          return {
            type: "explainer" as const,
            title: block.title,
            body: block.body,
            keyPoints: block.keyPoints.filter((item): item is string => typeof item === "string"),
          };
        }
      }

      return null;
    })
    .filter((item): item is ArticleBlock => Boolean(item));

  return mapped.length > 0 ? mapped : fallbackBlocks;
}

function mapTopic(entity: StrapiEntity): Topic | null {
  const fallback = typeof entity.slug === "string" ? getFallbackTopic(entity.slug) : null;
  const slug = entity.slug;
  const name = entity.name;
  const kicker = entity.kicker;
  const description = entity.description;
  const landingIntro = entity.landingIntro;
  const editorialFocus = entity.editorialFocus;
  const keyQuestions = entity.keyQuestions;
  const coverageFocus = entity.coverageFocus;
  const cadence = entity.cadence;

  if (
    typeof slug !== "string" ||
    (typeof name !== "string" && !fallback) ||
    (typeof kicker !== "string" && !fallback) ||
    (typeof description !== "string" && !fallback) ||
    (!Array.isArray(coverageFocus) && !fallback) ||
    (typeof cadence !== "string" && !fallback)
  ) {
    return null;
  }

  return {
    slug,
    name: typeof name === "string" ? name : fallback!.name,
    kicker: typeof kicker === "string" ? kicker : fallback!.kicker,
    description: typeof description === "string" ? description : fallback!.description,
    landingIntro:
      typeof landingIntro === "string"
        ? landingIntro
        : fallback?.landingIntro ?? (typeof description === "string" ? description : fallback!.description),
    editorialFocus:
      typeof editorialFocus === "string" ? editorialFocus : (fallback?.editorialFocus ?? ""),
    keyQuestions: Array.isArray(keyQuestions)
      ? keyQuestions.filter((item): item is string => typeof item === "string")
      : (fallback?.keyQuestions ?? []),
    coverageFocus: Array.isArray(coverageFocus)
      ? coverageFocus.filter((item): item is string => typeof item === "string")
      : fallback!.coverageFocus,
    cadence: typeof cadence === "string" ? cadence : fallback!.cadence,
  };
}

function mapAuthor(entity: StrapiEntity): Author | null {
  const fallback = typeof entity.slug === "string" ? getFallbackAuthor(entity.slug) : null;
  const name = entity.name;
  const slug = entity.slug;
  const role = entity.role;
  const bio = entity.bio;
  const credentials = entity.credentials;
  const coverageAreas = entity.coverageAreas;
  const editorialPrinciples = entity.editorialPrinciples;
  const contactNote = entity.contactNote;

  if (
    typeof slug !== "string" ||
    (typeof name !== "string" && !fallback) ||
    (typeof role !== "string" && !fallback) ||
    (typeof bio !== "string" && !fallback) ||
    (typeof credentials !== "string" && !fallback)
  ) {
    return null;
  }

  return {
    name: typeof name === "string" ? name : fallback!.name,
    slug,
    role: typeof role === "string" ? role : fallback!.role,
    bio: typeof bio === "string" ? bio : fallback!.bio,
    credentials: typeof credentials === "string" ? credentials : fallback!.credentials,
    coverageAreas: Array.isArray(coverageAreas)
      ? coverageAreas.filter((item): item is string => typeof item === "string")
      : (fallback?.coverageAreas ?? []),
    editorialPrinciples: Array.isArray(editorialPrinciples)
      ? editorialPrinciples.filter((item): item is string => typeof item === "string")
      : (fallback?.editorialPrinciples ?? []),
    contactNote: typeof contactNote === "string" ? contactNote : (fallback?.contactNote ?? ""),
  };
}

function mapArticle(entity: StrapiEntity): Article | null {
  const fallback = typeof entity.slug === "string" ? fallbackArticleBySlug(entity.slug) : null;
  const title = entity.title;
  const slug = entity.slug;
  const summary = entity.summary;
  const readTime = entity.readTime;
  const storyType = entity.storyType;
  const body = entity.body;
  const contentBlocks = entity.contentBlocks;
  const sources = entity.sources;
  const featured = entity.featured;
  const publishedOn = entity.publishedOn;
  const author = mapAuthor(unwrapRelation(entity.author) ?? {}) ?? fallback?.author ?? null;
  const topic = mapTopic(unwrapRelation(entity.topic) ?? {}) ?? fallback?.topic ?? null;

  if (
    typeof slug !== "string" ||
    (typeof title !== "string" && !fallback) ||
    (typeof summary !== "string" && !fallback) ||
    (typeof readTime !== "string" && !fallback) ||
    (storyType !== "reporting" && storyType !== "analysis" && storyType !== "opinion") ||
    (typeof body !== "string" && !fallback) ||
    (!Array.isArray(sources) && !fallback) ||
    (typeof featured !== "boolean" && !fallback) ||
    (typeof publishedOn !== "string" && !fallback) ||
    !author ||
    !topic
  ) {
    return null;
  }

  return {
    title: typeof title === "string" ? title : fallback!.title,
    slug,
    summary: typeof summary === "string" ? summary : fallback!.summary,
    readTime: typeof readTime === "string" ? readTime : fallback!.readTime,
    storyType,
    body: typeof body === "string" ? body : fallback!.body,
    contentBlocks: mapArticleBlocks(contentBlocks, fallback?.contentBlocks ?? []),
    sources: Array.isArray(sources)
      ? sources.filter((item): item is string => typeof item === "string")
      : fallback!.sources,
    featured: typeof featured === "boolean" ? featured : fallback!.featured,
    publishedOn: typeof publishedOn === "string" ? publishedOn : fallback!.publishedOn,
    author,
    topic,
  };
}

function sortArticles(items: Article[]) {
  return [...items].sort(
    (left, right) =>
      new Date(right.publishedOn).getTime() - new Date(left.publishedOn).getTime(),
  );
}

export async function getArticles(options: QueryOptions = {}) {
  const response = await fetchStrapi<StrapiListResponse<StrapiEntity>>(
    `/api/articles?sort[0]=publishedOn:desc&populate=*&status=${options.preview ? "draft" : "published"}`,
    options,
  );

  if (!response?.data?.length) {
    return sortArticles(fallbackArticles);
  }

  const mapped = response.data.map(mapArticle).filter((item): item is Article => Boolean(item));

  return mapped.length > 0 ? sortArticles(mapped) : sortArticles(fallbackArticles);
}

export async function getFeaturedArticle(options: QueryOptions = {}) {
  const allArticles = await getArticles(options);
  return allArticles.find((article) => article.featured) ?? allArticles[0] ?? null;
}

export async function getLatestArticles(limit = 3, options: QueryOptions = {}) {
  const allArticles = await getArticles(options);
  return allArticles.slice(0, limit);
}

export async function getArticleBySlug(slug: string, options: QueryOptions = {}) {
  const response = await fetchStrapi<StrapiListResponse<StrapiEntity>>(
    `/api/articles?filters[slug][$eq]=${encodeURIComponent(slug)}&populate=*&status=${options.preview ? "draft" : "published"}`,
    options,
  );

  const article = response?.data?.map(mapArticle).find((item): item is Article => Boolean(item));

  if (article) {
    return article;
  }

  return options.fallbackToLocal === false ? null : fallbackArticleBySlug(slug);
}

export async function getTopics(options: QueryOptions = {}) {
  const response = await fetchStrapi<StrapiListResponse<StrapiEntity>>(
    "/api/topics?sort[0]=name:asc",
    options,
  );

  if (!response?.data?.length) {
    return fallbackTopics;
  }

  const mapped = response.data.map(mapTopic).filter((item): item is Topic => Boolean(item));
  return mapped.length > 0 ? mapped : fallbackTopics;
}

export async function getTopicBySlug(slug: string, options: QueryOptions = {}) {
  const response = await fetchStrapi<StrapiListResponse<StrapiEntity>>(
    `/api/topics?filters[slug][$eq]=${encodeURIComponent(slug)}`,
    options,
  );

  const topic = response?.data?.map(mapTopic).find((item): item is Topic => Boolean(item));
  return topic ?? getFallbackTopic(slug);
}

export async function getArticlesByTopic(slug: string, options: QueryOptions = {}) {
  const response = await fetchStrapi<StrapiListResponse<StrapiEntity>>(
    `/api/articles?filters[topic][slug][$eq]=${encodeURIComponent(slug)}&sort[0]=publishedOn:desc&populate=*&status=${options.preview ? "draft" : "published"}`,
    options,
  );

  if (!response?.data?.length) {
    return sortArticles(fallbackArticles.filter((article) => article.topic.slug === slug));
  }

  const mapped = response.data.map(mapArticle).filter((item): item is Article => Boolean(item));
  return mapped.length > 0
    ? sortArticles(mapped)
    : sortArticles(fallbackArticles.filter((article) => article.topic.slug === slug));
}

export async function getHomepageData(options: QueryOptions = {}) {
  const [featuredArticle, latestArticles, topics] = await Promise.all([
    getFeaturedArticle(options),
    getLatestArticles(4, options),
    getTopics(options),
  ]);

  return {
    featuredArticle,
    latestArticles,
    topics,
  };
}

export async function getAuthors(options: QueryOptions = {}) {
  const response = await fetchStrapi<StrapiListResponse<StrapiEntity>>(
    "/api/authors?sort[0]=name:asc",
    options,
  );

  if (!response?.data?.length) {
    return fallbackAuthors;
  }

  const mapped = response.data.map(mapAuthor).filter((item): item is Author => Boolean(item));
  return mapped.length > 0 ? mapped : fallbackAuthors;
}

export async function getAuthorBySlug(slug: string, options: QueryOptions = {}) {
  const response = await fetchStrapi<StrapiListResponse<StrapiEntity>>(
    `/api/authors?filters[slug][$eq]=${encodeURIComponent(slug)}`,
    options,
  );

  const author = response?.data?.map(mapAuthor).find((item): item is Author => Boolean(item));
  return author ?? getFallbackAuthor(slug);
}

export async function getArticlesByAuthor(slug: string, options: QueryOptions = {}) {
  const response = await fetchStrapi<StrapiListResponse<StrapiEntity>>(
    `/api/articles?filters[author][slug][$eq]=${encodeURIComponent(slug)}&sort[0]=publishedOn:desc&populate=*&status=${options.preview ? "draft" : "published"}`,
    options,
  );

  if (!response?.data?.length) {
    return sortArticles(fallbackArticles.filter((article) => article.author.slug === slug));
  }

  const mapped = response.data.map(mapArticle).filter((item): item is Article => Boolean(item));
  return mapped.length > 0
    ? sortArticles(mapped)
    : sortArticles(fallbackArticles.filter((article) => article.author.slug === slug));
}

export function getFallbackRelatedArticles(topicSlug: string, currentSlug: string) {
  return sortArticles(
    fallbackArticles.filter(
      (article) => article.topic.slug === topicSlug && article.slug !== currentSlug,
    ),
  ).slice(0, 2);
}

export function hasCmsPreviewConfig() {
  return Boolean(STRAPI_URL && STRAPI_API_TOKEN && process.env.NEXT_PREVIEW_SECRET);
}
