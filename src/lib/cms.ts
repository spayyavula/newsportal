// --- Pay-per-read and Tipping API calls ---
export async function incrementArticleView(articleId: number | string) {
  if (!STRAPI_URL) return null;
  const url = `${normalizeBaseUrl(STRAPI_URL)}/api/articles/${articleId}/increment-view`;
  try {
    const res = await fetch(url, { method: 'POST' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function sendTip({ authorId, articleId, amount, currency, message }: { authorId: number | string, articleId: number | string, amount: number, currency: string, message?: string }) {
  if (!STRAPI_URL) return null;
  const url = `${normalizeBaseUrl(STRAPI_URL)}/api/tips/create`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authorId, articleId, amount, currency, message }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
import "server-only";
import {
  articles as fallbackArticles,
  authors as fallbackAuthors,
  fallbackDailyBrief,
  topicCards as fallbackTopics,
} from "@/content/site";
import type {
  Article,
  ArticleBlock,
  Author,
  BriefItem,
  ChartExhibit,
  DailyBrief,
  SourceNote,
  Topic,
} from "@/content/site";

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
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          `[cms] Strapi fetch returned ${response.status} for ${path}; falling back. ` +
            `Check that the Public role has find/findOne permissions for the targeted content type.`,
        );
      }
      return null;
    }

    return (await response.json()) as T;
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[cms] Strapi fetch threw for ${path}; falling back.`,
        error instanceof Error ? error.message : error,
      );
    }
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

function mapChartExhibit(entity: StrapiEntity | null): ChartExhibit | null {
  if (!entity) return null;

  const figureNumber = entity.figureNumber;
  const title = entity.title;
  const chartType = entity.chartType;
  const series = entity.series;
  const sourceNote = entity.sourceNote;

  if (
    typeof figureNumber !== "number" ||
    typeof title !== "string" ||
    (chartType !== "line" &&
      chartType !== "bar" &&
      chartType !== "area" &&
      chartType !== "dot" &&
      chartType !== "stackedBar") ||
    !Array.isArray(series) ||
    typeof sourceNote !== "string"
  ) {
    return null;
  }

  return {
    figureNumber,
    title,
    chartType,
    series: series as ChartExhibit["series"],
    xAxisLabel: typeof entity.xAxisLabel === "string" ? entity.xAxisLabel : undefined,
    yAxisLabel: typeof entity.yAxisLabel === "string" ? entity.yAxisLabel : undefined,
    sourceNote,
  };
}

function mapSourceNote(entry: unknown): SourceNote | null {
  if (!entry || typeof entry !== "object") return null;
  const cast = entry as Record<string, unknown>;
  if (typeof cast.text !== "string") return null;
  return {
    text: cast.text,
    url: typeof cast.url === "string" && cast.url.trim().length > 0 ? cast.url : undefined,
  };
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

      if (block.__component === "editorial.exhibit-reference") {
        const exhibit = mapChartExhibit(unwrapRelation(block.exhibit));
        if (exhibit) {
          return {
            type: "exhibit-reference" as const,
            exhibit,
          };
        }
      }

      return null;
    })
    .filter((item): item is ArticleBlock => Boolean(item));

  return mapped.length > 0 ? mapped : fallbackBlocks;
}

function mapBriefItem(value: unknown): BriefItem | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const entry = value as Record<string, unknown>;
  const title = entry.title;
  const summary = entry.summary;
  const articleLinkRaw = entry.articleLink;

  if (typeof title !== "string" || typeof summary !== "string") {
    return null;
  }

  const articleEntity = unwrapRelation(articleLinkRaw);
  const articleSlug =
    articleEntity && typeof articleEntity.slug === "string"
      ? articleEntity.slug
      : undefined;

  return { title, summary, articleSlug };
}

function mapDailyBrief(entity: StrapiEntity): DailyBrief | null {
  const publishedOn = entity.publishedOn;
  const headline = entity.headline;
  const developmentsRaw = entity.developments;
  const factCheckRaw = entity.factCheck;
  const explainerRaw = entity.explainer;

  if (
    typeof publishedOn !== "string" ||
    typeof headline !== "string" ||
    !Array.isArray(developmentsRaw)
  ) {
    return null;
  }

  const developments = developmentsRaw
    .map(mapBriefItem)
    .filter((item): item is BriefItem => Boolean(item));

  const factCheck = mapBriefItem(factCheckRaw);
  const explainer = mapBriefItem(explainerRaw);

  if (developments.length === 0 || !factCheck || !explainer) {
    return null;
  }

  return { publishedOn, headline, developments, factCheck, explainer };
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
  const deepDive = entity.deepDive;
  const formatRaw = entity.format;
  const executiveSummaryRaw = entity.executiveSummary;
  const leadExhibitRaw = entity.leadExhibit;
  const sourceNotesRaw = entity.sourceNotes;
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
    deepDive: typeof deepDive === "boolean" ? deepDive : (fallback?.deepDive ?? false),
    format: formatRaw === "light" ? "light" : "data-led",
    executiveSummary: Array.isArray(executiveSummaryRaw)
      ? executiveSummaryRaw
          .map((entry) =>
            entry &&
            typeof entry === "object" &&
            typeof (entry as { text?: unknown }).text === "string"
              ? (entry as { text: string }).text
              : null,
          )
          .filter((item): item is string => Boolean(item))
      : fallback?.executiveSummary,
    leadExhibit: mapChartExhibit(unwrapRelation(leadExhibitRaw)) ?? fallback?.leadExhibit,
    sourceNotes: Array.isArray(sourceNotesRaw)
      ? sourceNotesRaw
          .map(mapSourceNote)
          .filter((item): item is SourceNote => Boolean(item))
      : fallback?.sourceNotes,
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

function freshFallbackDailyBrief(): DailyBrief {
  // Use the local fallback's content shape but recompute publishedOn so the
  // homepage 'Updated …' line always reads as today. Tradeoff: in prod, a
  // misconfigured CMS no longer surfaces as a visibly stale date — the
  // non-prod console.warn in fetchStrapi remains the dev-side signal.
  return { ...fallbackDailyBrief, publishedOn: new Date().toISOString() };
}

export async function getChartExhibit(
  figureNumber: number,
  options: QueryOptions = {},
): Promise<ChartExhibit | null> {
  const response = await fetchStrapi<StrapiListResponse<StrapiEntity>>(
    `/api/chart-exhibits?filters[figureNumber][$eq]=${figureNumber}&pagination[limit]=1`,
    options,
  );
  const first = response?.data?.[0];
  return mapChartExhibit(first ?? null);
}

export async function getDailyBrief(options: QueryOptions = {}): Promise<DailyBrief> {
  const response = await fetchStrapi<StrapiListResponse<StrapiEntity>>(
    `/api/daily-briefs?sort[0]=publishedOn:desc&populate[developments][populate]=articleLink&populate[factCheck][populate]=articleLink&populate[explainer][populate]=articleLink&pagination[limit]=1&status=${options.preview ? "draft" : "published"}`,
    options,
  );

  const first = response?.data?.[0];

  if (!first) {
    return freshFallbackDailyBrief();
  }

  return mapDailyBrief(first) ?? freshFallbackDailyBrief();
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
  const [allArticles, topics, dailyBrief] = await Promise.all([
    getArticles(options),
    getTopics(options),
    getDailyBrief(options),
  ]);

  const anchorArticle =
    allArticles.find((article) => article.featured) ?? allArticles[0] ?? null;

  const deepDiveArticle =
    allArticles.find(
      (article) => article.deepDive && article.slug !== anchorArticle?.slug,
    ) ?? null;

  const excludedSlugs = new Set<string>();
  if (anchorArticle) excludedSlugs.add(anchorArticle.slug);
  if (deepDiveArticle) excludedSlugs.add(deepDiveArticle.slug);

  const latestArticles = allArticles
    .filter((article) => !excludedSlugs.has(article.slug))
    .slice(0, 3);

  return {
    anchorArticle,
    deepDiveArticle,
    dailyBrief,
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
