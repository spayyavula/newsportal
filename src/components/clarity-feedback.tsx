"use client";

import { useEffect, useState } from "react";

type ClarityFeedbackProps = {
  slug: string;
};

type State = "idle" | "no-branch" | "submitting" | "thanks";

const storageKey = (slug: string) => `cg-feedback-clarity:${slug}`;

export function ClarityFeedback({ slug }: ClarityFeedbackProps) {
  const [state, setState] = useState<State>("idle");
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(storageKey(slug))) {
      setState("thanks");
    }
  }, [slug]);

  async function submit(clarity: "yes" | "no", commentValue?: string) {
    setState("submitting");
    try {
      await fetch("/api/feedback/clarity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, clarity, comment: commentValue }),
      });
    } catch {
      // Swallow — we still want the UI to thank the reader.
    }
    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey(slug), "1");
    }
    setState("thanks");
  }

  if (state === "thanks") {
    return (
      <section className="clarity-feedback clarity-feedback-thanks">
        Thanks — noted.
      </section>
    );
  }

  if (state === "no-branch") {
    return (
      <section className="clarity-feedback">
        <p className="clarity-feedback-question">
          What was unclear? <span className="clarity-feedback-optional">(optional)</span>
        </p>
        <textarea
          className="clarity-feedback-textarea"
          maxLength={1000}
          onChange={(event) => setComment(event.target.value)}
          rows={3}
          value={comment}
        />
        <button
          className="button-secondary"
          onClick={() => void submit("no", comment)}
          type="button"
        >
          Send feedback
        </button>
      </section>
    );
  }

  return (
    <section className="clarity-feedback">
      <p className="clarity-feedback-question">Was this clear?</p>
      <div className="clarity-feedback-actions">
        <button
          className="clarity-feedback-pill"
          disabled={state === "submitting"}
          onClick={() => void submit("yes")}
          type="button"
        >
          Yes
        </button>
        <button
          className="clarity-feedback-pill"
          disabled={state === "submitting"}
          onClick={() => setState("no-branch")}
          type="button"
        >
          No
        </button>
      </div>
    </section>
  );
}
