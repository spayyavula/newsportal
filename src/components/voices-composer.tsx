"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY_PREFIX = "cg-voices-draft:";

type CritiqueState = "idle" | "loading" | "ready" | "error";
type SubmitState = "idle" | "submitting" | "submitted" | "error";

type VoicesComposerProps = {
  userId: number | string;
  topicOptions: { slug: string; name: string }[];
};

export function VoicesComposer({ userId, topicOptions }: VoicesComposerProps) {
  const storageKey = `${STORAGE_KEY_PREFIX}${userId}`;
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [topicSlug, setTopicSlug] = useState("");
  const [sourceUrlsText, setSourceUrlsText] = useState("");

  const [critiqueState, setCritiqueState] = useState<CritiqueState>("idle");
  const [critique, setCritique] = useState("");
  const [critiqueError, setCritiqueError] = useState("");

  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      setTitle(parsed.title ?? "");
      setBody(parsed.body ?? "");
      setTopicSlug(parsed.topicSlug ?? "");
      setSourceUrlsText(parsed.sourceUrlsText ?? "");
    } catch {
      // ignore
    }
  }, [storageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({ title, body, topicSlug, sourceUrlsText }),
    );
  }, [title, body, topicSlug, sourceUrlsText, storageKey]);

  function parsedSourceUrls(): string[] {
    return sourceUrlsText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }

  async function runCritique() {
    setCritiqueState("loading");
    setCritiqueError("");
    try {
      const response = await fetch("/api/voices/critique", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, sourceUrls: parsedSourceUrls() }),
      });
      const data = await response.json();
      if (!response.ok) {
        setCritiqueError(data.error ?? "critique-failed");
        setCritiqueState("error");
        return;
      }
      setCritique(data.critique);
      setCritiqueState("ready");
    } catch {
      setCritiqueError("network");
      setCritiqueState("error");
    }
  }

  async function submitDraft() {
    setSubmitState("submitting");
    setSubmitError("");
    try {
      const response = await fetch("/api/voices/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          body,
          topicSlug: topicSlug || null,
          sourceUrls: parsedSourceUrls(),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setSubmitError(data.error ?? "submit-failed");
        setSubmitState("error");
        return;
      }
      window.localStorage.removeItem(storageKey);
      setSubmitState("submitted");
    } catch {
      setSubmitError("network");
      setSubmitState("error");
    }
  }

  const bodyWordCount = body.trim().split(/\s+/).filter(Boolean).length;
  const bodyWithinRange = bodyWordCount >= 400 && bodyWordCount <= 1200;

  if (submitState === "submitted") {
    return (
      <section className="panel voices-form">
        <p className="eyebrow">Voices composer</p>
        <h2>Submitted</h2>
        <p>An editor will review your piece. You can write another draft any time.</p>
      </section>
    );
  }

  return (
    <section className="panel voices-form">
      <p className="eyebrow">Voices composer</p>

      <label className="voices-field">
        <span>Title</span>
        <input
          className="voices-input"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={200}
        />
      </label>

      <label className="voices-field">
        <span>Body (400-1200 words; you have {bodyWordCount})</span>
        <textarea
          className="voices-textarea voices-body-textarea"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={16}
        />
      </label>

      <label className="voices-field">
        <span>Topic (optional)</span>
        <select
          className="voices-input"
          value={topicSlug}
          onChange={(event) => setTopicSlug(event.target.value)}
        >
          <option value="">No topic</option>
          {topicOptions.map((topic) => (
            <option key={topic.slug} value={topic.slug}>{topic.name}</option>
          ))}
        </select>
      </label>

      <label className="voices-field">
        <span>Source URLs (one per line, optional)</span>
        <textarea
          className="voices-textarea"
          value={sourceUrlsText}
          onChange={(event) => setSourceUrlsText(event.target.value)}
          rows={4}
        />
      </label>

      <div className="voices-actions">
        <button
          className="button-secondary"
          type="button"
          onClick={() => void runCritique()}
          disabled={critiqueState === "loading" || title.length === 0 || body.length < 100}
        >
          {critiqueState === "loading" ? "Asking the AI editor..." : "Critique my draft"}
        </button>
        <button
          className="button-primary"
          type="button"
          onClick={() => void submitDraft()}
          disabled={submitState === "submitting" || !bodyWithinRange || title.length === 0}
        >
          {submitState === "submitting" ? "Submitting..." : "Submit for review"}
        </button>
      </div>

      {submitState === "error" ? (
        <p className="voices-status voices-status-error">Could not submit: {submitError}</p>
      ) : null}

      {critiqueState === "ready" ? (
        <section className="voices-critique">
          <p className="eyebrow">AI editorial critique</p>
          <p className="voices-critique-body">{critique}</p>
        </section>
      ) : null}
      {critiqueState === "error" ? (
        <p className="voices-status voices-status-error">Critique failed: {critiqueError}</p>
      ) : null}
    </section>
  );
}
