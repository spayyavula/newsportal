import type { StoryType } from "@/content/site";

export type DeliveryStyle = "briefing" | "deep-dive" | "mixed";

export type NewsAssistantProfile = {
  name: string;
  topicSlugs: string[];
  storyTypes: StoryType[];
  maxReadMinutes: number | null;
  includeKeywords: string[];
  excludeKeywords: string[];
  minSourceCount: number;
  onlyFeatured: boolean;
  deliveryStyle: DeliveryStyle;
};

export type FilterPreset = {
  documentId: string;
  name: string;
  description: string;
  profile: NewsAssistantProfile;
  isDefault: boolean;
};

export type NotificationFrequency = "daily" | "weekly" | "breaking";
export type NotificationChannel = "in-app" | "email";

export type NotificationRule = {
  documentId: string;
  name: string;
  active: boolean;
  frequency: NotificationFrequency;
  channel: NotificationChannel;
  deliveryHour: number;
  timezone: string;
  instruction: string;
  presetDocumentId: string | null;
  presetName: string | null;
};

export type SessionUser = {
  id: number;
  username: string;
  email: string;
};

export type ReaderSession = {
  user: SessionUser | null;
  profile: NewsAssistantProfile | null;
  presets: FilterPreset[];
  rules: NotificationRule[];
};

export type AssistantCitation = {
  index: number;
  title: string;
  slug?: string | null;
  url?: string | null;
  topic: string;
  publishedOn: string;
  sourceCount: number;
  publisher?: string | null;
  sourceType: "internal" | "external";
  reasons: string[];
};

export type ExternalNewsResult = {
  title: string;
  url: string;
  publishedOn: string;
  summary: string;
  publisher: string;
  score: number;
  reasons: string[];
};