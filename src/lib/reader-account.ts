import "server-only";

import { cookies } from "next/headers";
import type {
  FilterPreset,
  NewsAssistantProfile,
  NotificationRule,
  ReaderSession,
  SessionUser,
} from "@/lib/reader-types";

type StrapiAuthResponse = {
  jwt: string;
  user: {
    id: number;
    username: string;
    email: string;
  };
};

type StrapiListResponse<T> = {
  data: T[];
};

type StrapiEntry = Record<string, unknown> & {
  id?: number;
  documentId?: string;
};

export const SESSION_COOKIE = "common-ground-session";

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL ?? process.env.STRAPI_URL;
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;

function normalizeBaseUrl(url: string) {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

function strapiUrl(path: string) {
  if (!STRAPI_URL) {
    throw new Error("Strapi URL is not configured.");
  }

  return `${normalizeBaseUrl(STRAPI_URL)}${path}`;
}

async function strapiRequest<T>(
  path: string,
  init?: RequestInit,
  options?: { authToken?: string; useApiToken?: boolean },
) {
  const headers = new Headers(init?.headers ?? {});
  headers.set("Content-Type", "application/json");

  if (options?.authToken) {
    headers.set("Authorization", `Bearer ${options.authToken}`);
  } else if (options?.useApiToken && STRAPI_API_TOKEN) {
    headers.set("Authorization", `Bearer ${STRAPI_API_TOKEN}`);
  }

  const response = await fetch(strapiUrl(path), {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Strapi request failed with ${response.status}`);
  }

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
}

export async function readSessionToken() {
  return (await cookies()).get(SESSION_COOKIE)?.value ?? null;
}

export async function getCurrentUserFromToken(token: string | null): Promise<SessionUser | null> {
  if (!token || !STRAPI_URL) {
    return null;
  }

  try {
    const user = await strapiRequest<SessionUser>("/api/users/me", undefined, {
      authToken: token,
    });
    return user;
  } catch {
    return null;
  }
}

function mapProfileEntry(entry: StrapiEntry | null | undefined): NewsAssistantProfile | null {
  if (!entry) {
    return null;
  }

  const maxReadMinutes = typeof entry.maxReadMinutes === "number" ? entry.maxReadMinutes : null;

  return {
    name: typeof entry.displayName === "string" ? entry.displayName : "",
    topicSlugs: Array.isArray(entry.topicSlugs)
      ? entry.topicSlugs.filter((item): item is string => typeof item === "string")
      : [],
    storyTypes: Array.isArray(entry.storyTypes)
      ? entry.storyTypes.filter(
          (item): item is NewsAssistantProfile["storyTypes"][number] =>
            item === "reporting" || item === "analysis" || item === "opinion",
        )
      : [],
    maxReadMinutes,
    includeKeywords: Array.isArray(entry.includeKeywords)
      ? entry.includeKeywords.filter((item): item is string => typeof item === "string")
      : [],
    excludeKeywords: Array.isArray(entry.excludeKeywords)
      ? entry.excludeKeywords.filter((item): item is string => typeof item === "string")
      : [],
    minSourceCount: typeof entry.minSourceCount === "number" ? entry.minSourceCount : 1,
    onlyFeatured: Boolean(entry.onlyFeatured),
    deliveryStyle:
      entry.deliveryStyle === "briefing" ||
      entry.deliveryStyle === "mixed" ||
      entry.deliveryStyle === "deep-dive"
        ? entry.deliveryStyle
        : "mixed",
  };
}

function profileToPayload(profile: NewsAssistantProfile, ownerId: number) {
  return {
    displayName: profile.name,
    topicSlugs: profile.topicSlugs,
    storyTypes: profile.storyTypes,
    maxReadMinutes: profile.maxReadMinutes,
    includeKeywords: profile.includeKeywords,
    excludeKeywords: profile.excludeKeywords,
    minSourceCount: profile.minSourceCount,
    onlyFeatured: profile.onlyFeatured,
    deliveryStyle: profile.deliveryStyle,
    owner: ownerId,
  };
}

function defaultProfile(): NewsAssistantProfile {
  return {
    name: "",
    topicSlugs: [],
    storyTypes: [],
    maxReadMinutes: null,
    includeKeywords: [],
    excludeKeywords: [],
    minSourceCount: 1,
    onlyFeatured: false,
    deliveryStyle: "mixed",
  };
}

function mapPresetEntry(entry: StrapiEntry): FilterPreset | null {
  if (typeof entry.documentId !== "string" || typeof entry.name !== "string") {
    return null;
  }

  return {
    documentId: entry.documentId,
    name: entry.name,
    description: typeof entry.description === "string" ? entry.description : "",
    profile: mapProfileEntry(entry) ?? defaultProfile(),
    isDefault: Boolean(entry.isDefault),
  };
}

function presetToPayload(preset: Omit<FilterPreset, "documentId">, ownerId: number) {
  return {
    name: preset.name,
    description: preset.description,
    isDefault: preset.isDefault,
    ...profileToPayload(preset.profile, ownerId),
  };
}

function mapRuleEntry(entry: StrapiEntry): NotificationRule | null {
  if (typeof entry.documentId !== "string" || typeof entry.name !== "string") {
    return null;
  }

  const presetValue = entry.preset;
  const preset = presetValue && typeof presetValue === "object" ? (presetValue as StrapiEntry) : null;

  return {
    documentId: entry.documentId,
    name: entry.name,
    active: Boolean(entry.active),
    frequency:
      entry.frequency === "daily" || entry.frequency === "weekly" || entry.frequency === "breaking"
        ? entry.frequency
        : "daily",
    channel: entry.channel === "email" ? "email" : "in-app",
    deliveryHour:
      typeof entry.deliveryHour === "number" ? Math.max(0, Math.min(23, entry.deliveryHour)) : 8,
    timezone: typeof entry.timezone === "string" ? entry.timezone : "UTC",
    instruction: typeof entry.instruction === "string" ? entry.instruction : "",
    presetDocumentId: typeof preset?.documentId === "string" ? preset.documentId : null,
    presetName: typeof preset?.name === "string" ? preset.name : null,
  };
}

export async function loginReader(email: string, password: string) {
  return strapiRequest<StrapiAuthResponse>(
    "/api/auth/local",
    {
      method: "POST",
      body: JSON.stringify({ identifier: email, password }),
    },
  );
}

export async function registerReader(name: string, email: string, password: string) {
  const username = name?.trim() || email.split("@")[0];
  return strapiRequest<StrapiAuthResponse>(
    "/api/auth/local/register",
    {
      method: "POST",
      body: JSON.stringify({ username, email, password }),
    },
  );
}

export async function getReaderWorkspace(userId: number): Promise<ReaderSession> {
  const empty: ReaderSession = {
    user: null,
    profile: null,
    presets: [],
    rules: [],
  };

  if (!STRAPI_URL || !STRAPI_API_TOKEN) {
    return empty;
  }

  const [profilesResponse, presetsResponse, rulesResponse] = await Promise.all([
    strapiRequest<StrapiListResponse<StrapiEntry>>(
      `/api/reader-profiles?filters[owner][id][$eq]=${userId}&pagination[pageSize]=1`,
      undefined,
      { useApiToken: true },
    ),
    strapiRequest<StrapiListResponse<StrapiEntry>>(
      `/api/filter-presets?filters[owner][id][$eq]=${userId}&sort[0]=name:asc`,
      undefined,
      { useApiToken: true },
    ),
    strapiRequest<StrapiListResponse<StrapiEntry>>(
      `/api/notification-rules?filters[owner][id][$eq]=${userId}&sort[0]=name:asc&populate[preset]=*`,
      undefined,
      { useApiToken: true },
    ),
  ]);

  return {
    user: null,
    profile: mapProfileEntry(profilesResponse.data[0]),
    presets: presetsResponse.data.map(mapPresetEntry).filter((item): item is FilterPreset => Boolean(item)),
    rules: rulesResponse.data.map(mapRuleEntry).filter((item): item is NotificationRule => Boolean(item)),
  };
}

export async function upsertReaderProfile(userId: number, profile: NewsAssistantProfile) {
  const existing = await strapiRequest<StrapiListResponse<StrapiEntry>>(
    `/api/reader-profiles?filters[owner][id][$eq]=${userId}&pagination[pageSize]=1`,
    undefined,
    { useApiToken: true },
  );

  const body = JSON.stringify({ data: profileToPayload(profile, userId) });

  const response = existing.data[0]?.documentId
    ? await strapiRequest<{ data: StrapiEntry }>(
        `/api/reader-profiles/${existing.data[0].documentId}`,
        {
          method: "PUT",
          body,
        },
        { useApiToken: true },
      )
    : await strapiRequest<{ data: StrapiEntry }>(
        "/api/reader-profiles",
        {
          method: "POST",
          body,
        },
        { useApiToken: true },
      );

  return mapProfileEntry(response.data);
}

export async function createFilterPreset(userId: number, preset: Omit<FilterPreset, "documentId">) {
  const response = await strapiRequest<{ data: StrapiEntry }>(
    "/api/filter-presets",
    {
      method: "POST",
      body: JSON.stringify({ data: presetToPayload(preset, userId) }),
    },
    { useApiToken: true },
  );

  return mapPresetEntry(response.data);
}

export async function updateFilterPreset(
  userId: number,
  documentId: string,
  preset: Omit<FilterPreset, "documentId">,
) {
  const response = await strapiRequest<{ data: StrapiEntry }>(
    `/api/filter-presets/${documentId}`,
    {
      method: "PUT",
      body: JSON.stringify({ data: presetToPayload(preset, userId) }),
    },
    { useApiToken: true },
  );

  return mapPresetEntry(response.data);
}

export async function deleteFilterPreset(documentId: string) {
  await strapiRequest(`/api/filter-presets/${documentId}`, { method: "DELETE" }, { useApiToken: true });
}

export async function createNotificationRule(
  userId: number,
  rule: Omit<NotificationRule, "documentId" | "presetName">,
) {
  const response = await strapiRequest<{ data: StrapiEntry }>(
    "/api/notification-rules",
    {
      method: "POST",
      body: JSON.stringify({
        data: {
          name: rule.name,
          active: rule.active,
          frequency: rule.frequency,
          channel: rule.channel,
          deliveryHour: rule.deliveryHour,
          timezone: rule.timezone,
          instruction: rule.instruction,
          owner: userId,
          ...(rule.presetDocumentId ? { preset: rule.presetDocumentId } : {}),
        },
      }),
    },
    { useApiToken: true },
  );

  return mapRuleEntry(response.data);
}

export async function updateNotificationRule(
  userId: number,
  documentId: string,
  rule: Omit<NotificationRule, "documentId" | "presetName">,
) {
  const response = await strapiRequest<{ data: StrapiEntry }>(
    `/api/notification-rules/${documentId}`,
    {
      method: "PUT",
      body: JSON.stringify({
        data: {
          name: rule.name,
          active: rule.active,
          frequency: rule.frequency,
          channel: rule.channel,
          deliveryHour: rule.deliveryHour,
          timezone: rule.timezone,
          instruction: rule.instruction,
          owner: userId,
          preset: rule.presetDocumentId,
        },
      }),
    },
    { useApiToken: true },
  );

  return mapRuleEntry(response.data);
}

export async function deleteNotificationRule(documentId: string) {
  await strapiRequest(`/api/notification-rules/${documentId}`, { method: "DELETE" }, { useApiToken: true });
}

export async function getActiveReaderSession() {
  const token = await readSessionToken();
  const user = await getCurrentUserFromToken(token);

  if (!user) {
    return {
      user: null,
      profile: null,
      presets: [],
      rules: [],
    } satisfies ReaderSession;
  }

  const workspace = await getReaderWorkspace(user.id);
  return {
    ...workspace,
    user,
  } satisfies ReaderSession;
}