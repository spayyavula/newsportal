"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { StoryType, Topic } from "@/content/site";
import type { AssistantRecommendation, NewsAssistantResponse } from "@/lib/news-assistant";
import type {
  ExternalNewsResult,
  FilterPreset,
  NewsAssistantProfile,
  NotificationChannel,
  NotificationFrequency,
  NotificationRule,
  ReaderSession,
} from "@/lib/reader-types";

const STORAGE_KEY = "common-ground-assistant-profile";
const STORY_TYPES: StoryType[] = ["reporting", "analysis", "opinion"];
const DELIVERY_STYLES: NewsAssistantProfile["deliveryStyle"][] = ["briefing", "mixed", "deep-dive"];
const NOTIFICATION_FREQUENCIES: NotificationFrequency[] = ["daily", "weekly", "breaking"];
const NOTIFICATION_CHANNELS: NotificationChannel[] = ["in-app", "email"];

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  recommendations?: AssistantRecommendation[];
  externalResults?: ExternalNewsResult[];
  citations?: NewsAssistantResponse["citations"];
  model?: string | null;
};

type NewsAssistantProps = {
  topics: Topic[];
};

const defaultProfile: NewsAssistantProfile = {
  name: "",
  topicSlugs: [],
  storyTypes: ["reporting", "analysis"],
  maxReadMinutes: 10,
  includeKeywords: [],
  excludeKeywords: [],
  minSourceCount: 1,
  onlyFeatured: false,
  deliveryStyle: "mixed",
};

const emptySession: ReaderSession = {
  user: null,
  profile: null,
  presets: [],
  rules: [],
};

function splitKeywords(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinKeywords(values: string[]) {
  return values.join(", ");
}

async function fetchJson<T>(input: RequestInfo, init?: RequestInit) {
  const response = await fetch(input, init);
  const data = (await response.json()) as T & { error?: string };

  if (!response.ok) {
    throw new Error(data.error ?? "Request failed");
  }

  return data;
}

export function NewsAssistant({ topics }: NewsAssistantProps) {
  const [profile, setProfile] = useState<NewsAssistantProfile>(defaultProfile);
  const [message, setMessage] = useState("");
  const [includeKeywordsText, setIncludeKeywordsText] = useState("");
  const [excludeKeywordsText, setExcludeKeywordsText] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "assistant-welcome",
      role: "assistant",
      text:
        "Sign in to persist your profile, presets, and briefing rules. Without an account, the assistant still works locally in this browser.",
    },
  ]);
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([]);
  const [summaryLabel, setSummaryLabel] = useState("Waiting for your profile");
  const [session, setSession] = useState<ReaderSession>(emptySession);
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" });
  const [presetForm, setPresetForm] = useState({ name: "", description: "", isDefault: false });
  const [ruleForm, setRuleForm] = useState({
    name: "Morning briefing",
    frequency: "daily" as NotificationFrequency,
    channel: "in-app" as NotificationChannel,
    deliveryHour: 8,
    timezone: "UTC",
    instruction: "Summarize only the strongest matches and lead with what changed.",
    presetDocumentId: "",
  });
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    void loadSession();
  }, []);

  useEffect(() => {
    if (session.user) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  }, [profile, session.user]);

  async function loadSession() {
    try {
      const nextSession = await fetchJson<ReaderSession>("/api/auth/session");
      setSession(nextSession);

      if (nextSession.user && nextSession.profile) {
        setProfile(nextSession.profile);
        setIncludeKeywordsText(joinKeywords(nextSession.profile.includeKeywords));
        setExcludeKeywordsText(joinKeywords(nextSession.profile.excludeKeywords));
        setSummaryLabel(`Signed in as ${nextSession.user.email}`);
        return;
      }

      const stored = window.localStorage.getItem(STORAGE_KEY);

      if (stored) {
        const parsed = JSON.parse(stored) as Partial<NewsAssistantProfile>;
        const fallbackProfile = { ...defaultProfile, ...parsed };
        setProfile(fallbackProfile);
        setIncludeKeywordsText(joinKeywords(fallbackProfile.includeKeywords));
        setExcludeKeywordsText(joinKeywords(fallbackProfile.excludeKeywords));
      }
    } catch {
      setSession(emptySession);
    }
  }

  function updateProfile(partial: Partial<NewsAssistantProfile>) {
    setProfile((current) => ({ ...current, ...partial }));
  }

  function toggleTopic(slug: string) {
    updateProfile({
      topicSlugs: profile.topicSlugs.includes(slug)
        ? profile.topicSlugs.filter((item) => item !== slug)
        : [...profile.topicSlugs, slug],
    });
  }

  function toggleStoryType(storyType: StoryType) {
    updateProfile({
      storyTypes: profile.storyTypes.includes(storyType)
        ? profile.storyTypes.filter((item) => item !== storyType)
        : [...profile.storyTypes, storyType],
    });
  }

  async function handleAuthSubmit() {
    setStatusMessage("");

    try {
      const endpoint = authMode === "login" ? "/api/auth/login" : "/api/auth/register";
      await fetchJson(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(authForm),
      });
      setAuthForm({ name: "", email: "", password: "" });
      setStatusMessage(authMode === "login" ? "Signed in." : "Account created and signed in.");
      await loadSession();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Authentication failed.");
    }
  }

  async function handleLogout() {
    await fetchJson("/api/auth/logout", { method: "POST" });
    setSession(emptySession);
    setStatusMessage("Signed out.");
  }

  async function saveProfileToAccount() {
    setIsSavingProfile(true);
    setStatusMessage("");

    try {
      await fetchJson<{ profile: NewsAssistantProfile }>("/api/reader/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ profile }),
      });
      setStatusMessage("Profile saved to your account.");
      await loadSession();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Profile save failed.");
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function savePreset() {
    if (!presetForm.name.trim()) {
      setStatusMessage("Preset name is required.");
      return;
    }

    try {
      await fetchJson("/api/reader/presets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...presetForm, profile }),
      });
      setPresetForm({ name: "", description: "", isDefault: false });
      setStatusMessage("Preset saved.");
      await loadSession();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Preset save failed.");
    }
  }

  async function deletePreset(documentId: string) {
    await fetchJson(`/api/reader/presets/${documentId}`, { method: "DELETE" });
    setStatusMessage("Preset deleted.");
    await loadSession();
  }

  async function saveRule() {
    if (!ruleForm.name.trim()) {
      setStatusMessage("Rule name is required.");
      return;
    }

    try {
      await fetchJson("/api/reader/rules", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...ruleForm,
          presetDocumentId: ruleForm.presetDocumentId || null,
        }),
      });
      setStatusMessage("Notification rule saved.");
      await loadSession();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Rule save failed.");
    }
  }

  async function deleteRule(documentId: string) {
    await fetchJson(`/api/reader/rules/${documentId}`, { method: "DELETE" });
    setStatusMessage("Notification rule deleted.");
    await loadSession();
  }

  async function sendPrompt(nextMessage: string) {
    const trimmed = nextMessage.trim();

    if (!trimmed) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: trimmed,
    };

    setMessages((current) => [...current, userMessage]);
    setMessage("");
    setIsLoading(true);

    const excludeSlugs = Array.from(
      new Set(
        messages.flatMap((entry) =>
          (entry.recommendations ?? []).map((item) => item.article.slug),
        ),
      ),
    );
    const excludeUrls = Array.from(
      new Set(
        messages.flatMap((entry) =>
          (entry.externalResults ?? []).map((item) => item.url),
        ),
      ),
    );

    try {
      const data = await fetchJson<NewsAssistantResponse>("/api/assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: trimmed,
          profile,
          excludeSlugs,
          excludeUrls,
        }),
      });

      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          text: data.reply,
          recommendations: data.recommendations,
          externalResults: data.externalResults,
          citations: data.citations,
          model: data.model,
        },
      ]);
      setSuggestedPrompts(data.suggestedPrompts);
      setSummaryLabel(data.summaryLabel);
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: `assistant-error-${Date.now()}`,
          role: "assistant",
          text:
            "I couldn't build your briefing just now. Check that the frontend is running, your API config is valid, and try again.",
        },
      ]);
      setSummaryLabel("Assistant unavailable");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="assistant-layout">
      <aside className="panel assistant-controls">
        <div className="assistant-section-heading">
          <p className="eyebrow">Account</p>
          <h2>Persist your briefing profile</h2>
          <p>
            Reader accounts are backed by Strapi auth. Signed-in users can save
            profiles, presets, and recurring briefing rules instead of relying only on local storage.
          </p>
        </div>

        {session.user ? (
          <div className="assistant-auth-card">
            <strong>{session.user.email}</strong>
            <p>Your assistant profile is now account-backed.</p>
            <button className="button-secondary" onClick={() => void handleLogout()} type="button">
              Sign out
            </button>
          </div>
        ) : (
          <div className="assistant-auth-card">
            <div className="assistant-chip-grid compact-chips">
              <button
                className={`assistant-chip${authMode === "login" ? " is-active" : ""}`}
                onClick={() => setAuthMode("login")}
                type="button"
              >
                Login
              </button>
              <button
                className={`assistant-chip${authMode === "register" ? " is-active" : ""}`}
                onClick={() => setAuthMode("register")}
                type="button"
              >
                Register
              </button>
            </div>

            {authMode === "register" ? (
              <label className="assistant-field">
                <span>Name</span>
                <input
                  className="assistant-input"
                  value={authForm.name}
                  onChange={(event) =>
                    setAuthForm((current) => ({ ...current, name: event.target.value }))
                  }
                />
              </label>
            ) : null}

            <label className="assistant-field">
              <span>Email</span>
              <input
                className="assistant-input"
                type="email"
                value={authForm.email}
                onChange={(event) =>
                  setAuthForm((current) => ({ ...current, email: event.target.value }))
                }
              />
            </label>

            <label className="assistant-field">
              <span>Password</span>
              <input
                className="assistant-input"
                type="password"
                value={authForm.password}
                onChange={(event) =>
                  setAuthForm((current) => ({ ...current, password: event.target.value }))
                }
              />
            </label>

            <button className="button-primary" onClick={() => void handleAuthSubmit()} type="button">
              {authMode === "login" ? "Sign in" : "Create account"}
            </button>

            {statusMessage ? (
              <p className="assistant-status assistant-status-inline">{statusMessage}</p>
            ) : null}
          </div>
        )}

        <div className="assistant-section-heading">
          <p className="eyebrow">Personalization</p>
          <h2>Build a reader profile</h2>
        </div>

        <label className="assistant-field">
          <span>Name</span>
          <input
            className="assistant-input"
            value={profile.name}
            onChange={(event) => updateProfile({ name: event.target.value })}
            placeholder="Reader name"
          />
        </label>

        <div className="assistant-field">
          <span>Topics</span>
          <div className="assistant-chip-grid">
            {topics.map((topic) => (
              <button
                className={`assistant-chip${profile.topicSlugs.includes(topic.slug) ? " is-active" : ""}`}
                key={topic.slug}
                onClick={() => toggleTopic(topic.slug)}
                type="button"
              >
                {topic.name}
              </button>
            ))}
          </div>
        </div>

        <div className="assistant-field">
          <span>Story types</span>
          <div className="assistant-chip-grid compact-chips">
            {STORY_TYPES.map((storyType) => (
              <button
                className={`assistant-chip${profile.storyTypes.includes(storyType) ? " is-active" : ""}`}
                key={storyType}
                onClick={() => toggleStoryType(storyType)}
                type="button"
              >
                {storyType}
              </button>
            ))}
          </div>
        </div>

        <div className="assistant-grid-two">
          <label className="assistant-field">
            <span>Max read time</span>
            <input
              className="assistant-input"
              min={1}
              max={60}
              type="number"
              value={profile.maxReadMinutes ?? ""}
              onChange={(event) =>
                updateProfile({
                  maxReadMinutes: event.target.value ? Number(event.target.value) : null,
                })
              }
            />
          </label>
          <label className="assistant-field">
            <span>Minimum sources</span>
            <input
              className="assistant-input"
              min={0}
              max={10}
              type="number"
              value={profile.minSourceCount}
              onChange={(event) => updateProfile({ minSourceCount: Number(event.target.value) })}
            />
          </label>
        </div>

        <label className="assistant-field">
          <span>Must include keywords</span>
          <input
            className="assistant-input"
            value={includeKeywordsText}
            onChange={(event) => {
              setIncludeKeywordsText(event.target.value);
              updateProfile({ includeKeywords: splitKeywords(event.target.value) });
            }}
            placeholder="housing, grid, wages"
          />
        </label>

        <label className="assistant-field">
          <span>Blocked keywords</span>
          <input
            className="assistant-input"
            value={excludeKeywordsText}
            onChange={(event) => {
              setExcludeKeywordsText(event.target.value);
              updateProfile({ excludeKeywords: splitKeywords(event.target.value) });
            }}
            placeholder="celebrity, rumor, markets"
          />
        </label>

        <label className="assistant-field">
          <span>Delivery style</span>
          <select
            className="assistant-input"
            value={profile.deliveryStyle}
            onChange={(event) =>
              updateProfile({ deliveryStyle: event.target.value as NewsAssistantProfile["deliveryStyle"] })
            }
          >
            {DELIVERY_STYLES.map((style) => (
              <option key={style} value={style}>
                {style}
              </option>
            ))}
          </select>
        </label>

        <label className="assistant-toggle">
          <input
            checked={profile.onlyFeatured}
            onChange={(event) => updateProfile({ onlyFeatured: event.target.checked })}
            type="checkbox"
          />
          <span>Only show editor-featured stories</span>
        </label>

        {session.user ? (
          <button
            className="button-primary"
            disabled={isSavingProfile}
            onClick={() => void saveProfileToAccount()}
            type="button"
          >
            {isSavingProfile ? "Saving..." : "Save profile to account"}
          </button>
        ) : null}

        <div className="assistant-profile-note">
          <strong>{summaryLabel}</strong>
          <p>
            The assistant still filters Common Ground&apos;s own reporting first. If an
            LLM key is configured, generation happens only after ranking and filtering the article set.
          </p>
        </div>

        {session.user ? (
          <>
            <div className="assistant-section-heading">
              <p className="eyebrow">Presets</p>
              <h2>Save reusable filter bundles</h2>
            </div>

            <label className="assistant-field">
              <span>Preset name</span>
              <input
                className="assistant-input"
                value={presetForm.name}
                onChange={(event) =>
                  setPresetForm((current) => ({ ...current, name: event.target.value }))
                }
              />
            </label>
            <label className="assistant-field">
              <span>Description</span>
              <input
                className="assistant-input"
                value={presetForm.description}
                onChange={(event) =>
                  setPresetForm((current) => ({ ...current, description: event.target.value }))
                }
              />
            </label>
            <label className="assistant-toggle">
              <input
                checked={presetForm.isDefault}
                onChange={(event) =>
                  setPresetForm((current) => ({ ...current, isDefault: event.target.checked }))
                }
                type="checkbox"
              />
              <span>Make this my default preset</span>
            </label>
            <button className="button-secondary" onClick={() => void savePreset()} type="button">
              Save current profile as preset
            </button>

            <div className="assistant-collection">
              {session.presets.map((preset: FilterPreset) => (
                <article className="assistant-list-card" key={preset.documentId}>
                  <div>
                    <strong>{preset.name}</strong>
                    <p>{preset.description || "No description"}</p>
                  </div>
                  <div className="assistant-inline-actions">
                    <button
                      className="assistant-suggestion"
                      onClick={() => {
                        setProfile(preset.profile);
                        setIncludeKeywordsText(joinKeywords(preset.profile.includeKeywords));
                        setExcludeKeywordsText(joinKeywords(preset.profile.excludeKeywords));
                      }}
                      type="button"
                    >
                      Apply
                    </button>
                    <button
                      className="assistant-suggestion"
                      onClick={() => void deletePreset(preset.documentId)}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <div className="assistant-section-heading">
              <p className="eyebrow">Recurring briefings</p>
              <h2>Save notification rules</h2>
            </div>

            <label className="assistant-field">
              <span>Rule name</span>
              <input
                className="assistant-input"
                value={ruleForm.name}
                onChange={(event) =>
                  setRuleForm((current) => ({ ...current, name: event.target.value }))
                }
              />
            </label>
            <div className="assistant-grid-two">
              <label className="assistant-field">
                <span>Frequency</span>
                <select
                  className="assistant-input"
                  value={ruleForm.frequency}
                  onChange={(event) =>
                    setRuleForm((current) => ({
                      ...current,
                      frequency: event.target.value as NotificationFrequency,
                    }))
                  }
                >
                  {NOTIFICATION_FREQUENCIES.map((frequency) => (
                    <option key={frequency} value={frequency}>
                      {frequency}
                    </option>
                  ))}
                </select>
              </label>
              <label className="assistant-field">
                <span>Channel</span>
                <select
                  className="assistant-input"
                  value={ruleForm.channel}
                  onChange={(event) =>
                    setRuleForm((current) => ({
                      ...current,
                      channel: event.target.value as NotificationChannel,
                    }))
                  }
                >
                  {NOTIFICATION_CHANNELS.map((channel) => (
                    <option key={channel} value={channel}>
                      {channel}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="assistant-grid-two">
              <label className="assistant-field">
                <span>Delivery hour</span>
                <input
                  className="assistant-input"
                  max={23}
                  min={0}
                  type="number"
                  value={ruleForm.deliveryHour}
                  onChange={(event) =>
                    setRuleForm((current) => ({ ...current, deliveryHour: Number(event.target.value) }))
                  }
                />
              </label>
              <label className="assistant-field">
                <span>Timezone</span>
                <input
                  className="assistant-input"
                  value={ruleForm.timezone}
                  onChange={(event) =>
                    setRuleForm((current) => ({ ...current, timezone: event.target.value }))
                  }
                />
              </label>
            </div>

            <label className="assistant-field">
              <span>Preset</span>
              <select
                className="assistant-input"
                value={ruleForm.presetDocumentId}
                onChange={(event) =>
                  setRuleForm((current) => ({ ...current, presetDocumentId: event.target.value }))
                }
              >
                <option value="">Use the current live profile</option>
                {session.presets.map((preset) => (
                  <option key={preset.documentId} value={preset.documentId}>
                    {preset.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="assistant-field">
              <span>Instruction</span>
              <textarea
                className="assistant-textarea"
                rows={3}
                value={ruleForm.instruction}
                onChange={(event) =>
                  setRuleForm((current) => ({ ...current, instruction: event.target.value }))
                }
              />
            </label>

            <button className="button-secondary" onClick={() => void saveRule()} type="button">
              Save notification rule
            </button>

            <div className="assistant-collection">
              {session.rules.map((rule: NotificationRule) => (
                <article className="assistant-list-card" key={rule.documentId}>
                  <div>
                    <strong>{rule.name}</strong>
                    <p>
                      {rule.frequency} via {rule.channel} at {rule.deliveryHour}:00 {rule.timezone}
                      {rule.presetName ? ` using ${rule.presetName}` : " using the current profile"}
                    </p>
                  </div>
                  <div className="assistant-inline-actions">
                    <button
                      className="assistant-suggestion"
                      onClick={() => void deleteRule(rule.documentId)}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : null}

        {statusMessage ? <p className="assistant-status">{statusMessage}</p> : null}
      </aside>

      <section className="assistant-chat-shell">
        <div className="panel page-hero assistant-hero">
          <p className="eyebrow">News assistant</p>
          <h1>Filtered first, generated second.</h1>
          <p className="page-copy">
            The assistant first ranks Common Ground stories against your filters. If
            an LLM is configured, it then writes the response from that vetted shortlist and attaches citations.
          </p>
        </div>

        <div className="assistant-messages">
          {messages.map((entry) => (
            <article className={`panel assistant-message assistant-message-${entry.role}`} key={entry.id}>
              <p className="assistant-message-label">{entry.role === "assistant" ? "Assistant" : "You"}</p>
              <p>{entry.text}</p>

              {entry.recommendations && entry.recommendations.length > 0 ? (
                <div className="assistant-recommendations">
                  {entry.recommendations.map((recommendation) => (
                    <Link
                      className="assistant-recommendation"
                      href={`/articles/${recommendation.article.slug}`}
                      key={recommendation.article.slug}
                    >
                      <div>
                        <p className="card-kicker">{recommendation.article.topic.name}</p>
                        <h3>{recommendation.article.title}</h3>
                      </div>
                      <p>{recommendation.article.summary}</p>
                      <div className="assistant-recommendation-meta">
                        <span>{recommendation.article.readTime}</span>
                        <span>{recommendation.reasons.join(" • ")}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : null}

              {entry.externalResults && entry.externalResults.length > 0 ? (
                <div className="assistant-recommendations">
                  {entry.externalResults.map((result) => (
                    <a
                      className="assistant-recommendation"
                      href={result.url}
                      key={result.url}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <div>
                        <p className="card-kicker">Exa news search</p>
                        <h3>{result.title}</h3>
                      </div>
                      <p>{result.summary}</p>
                      <div className="assistant-recommendation-meta">
                        <span>{result.publisher}</span>
                        <span>{result.reasons.join(" • ")}</span>
                      </div>
                    </a>
                  ))}
                </div>
              ) : null}

              {entry.citations && entry.citations.length > 0 ? (
                <div className="assistant-citations">
                  <p className="assistant-message-label">Citations{entry.model ? ` · ${entry.model}` : ""}</p>
                  {entry.citations.map((citation) => (
                    citation.sourceType === "external" && citation.url ? (
                      <a
                        className="assistant-citation"
                        href={citation.url}
                        key={`${entry.id}-${citation.index}`}
                        rel="noreferrer"
                        target="_blank"
                      >
                        <strong>[{citation.index}] {citation.title}</strong>
                        <span>{citation.publisher ?? citation.topic} · {citation.reasons.join(" • ")}</span>
                      </a>
                    ) : citation.slug ? (
                      <Link className="assistant-citation" href={`/articles/${citation.slug}`} key={`${entry.id}-${citation.index}`}>
                        <strong>[{citation.index}] {citation.title}</strong>
                        <span>{citation.topic} · {citation.sourceCount} sources · {citation.reasons.join(" • ")}</span>
                      </Link>
                    ) : null
                  ))}
                </div>
              ) : null}
            </article>
          ))}

          {isLoading ? (
            <article className="panel assistant-message assistant-message-assistant">
              <p className="assistant-message-label">Assistant</p>
              <p>Filtering the newsroom and assembling your briefing.</p>
            </article>
          ) : null}
        </div>

        <form
          className="panel assistant-composer"
          onSubmit={(event) => {
            event.preventDefault();
            void sendPrompt(message);
          }}
        >
          <label className="assistant-field">
            <span>Ask for a personalized brief</span>
            <textarea
              className="assistant-textarea"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Give me a weekly briefing for climate and labor, no opinion, and cite every recommendation."
              rows={4}
            />
          </label>
          <div className="assistant-composer-actions">
            <button className="button-primary" disabled={isLoading} type="submit">
              Get my briefing
            </button>
            <button
              className="button-secondary"
              onClick={() => void sendPrompt("Give me a briefing based on my saved profile.")}
              disabled={isLoading}
              type="button"
            >
              Use saved profile only
            </button>
          </div>

          {suggestedPrompts.length > 0 ? (
            <div className="assistant-suggestions">
              {suggestedPrompts.map((prompt) => (
                <button className="assistant-suggestion" key={prompt} onClick={() => void sendPrompt(prompt)} type="button">
                  {prompt}
                </button>
              ))}
            </div>
          ) : null}
        </form>
      </section>
    </div>
  );
}