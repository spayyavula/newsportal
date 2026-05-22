import "server-only";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
const PROMPT_CACHE_KEY = "common-ground-voices-critique:v1";

const CRITIQUE_SYSTEM_PROMPT = `
Common Ground is an advertisement-free public-interest news portal. Its
editorial rules are:

1. Headlines inform before they persuade. Never use fear-based framing
   or rhetorical devices designed to trigger clicks.
2. Every claim should be traceable to its origin. Prefer primary
   records and named interviews over summaries.
3. Story placement reflects civic value, not engagement metrics.
4. Corrections are transparent. Acknowledge uncertainty explicitly.

You are an editor coaching a community contributor. Read the draft they
provide. Return a short written critique (250-500 words, plain prose,
no bullet list unless the contributor asks for one).

Cover:
- Where the argument is clear and where it isn't.
- Which claims need a source.
- Which sentences feel padded, vague, or rhetorical.
- Whether the length is right for the substance.
- What one revision would most improve the piece.

Be specific and kind. The goal is to help them write better, not to
gatekeep. Never rewrite the draft for them. Never say the draft is
good if it isn't.
`.trim();

export type CritiqueResult =
  | { ok: true; critique: string; model: string }
  | { ok: false; error: string };

export async function critiqueDraft(input: {
  title: string;
  body: string;
  sourceUrls: string[];
}): Promise<CritiqueResult> {
  if (!OPENAI_API_KEY) {
    return { ok: false, error: "openai-not-configured" };
  }

  try {
    const response = await fetch(`${OPENAI_BASE_URL.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.4,
        prompt_cache_key: PROMPT_CACHE_KEY,
        messages: [
          { role: "system", content: CRITIQUE_SYSTEM_PROMPT },
          {
            role: "user",
            content: JSON.stringify({
              title: input.title,
              body: input.body,
              sourceUrls: input.sourceUrls,
            }),
          },
        ],
      }),
    });

    if (!response.ok) {
      return { ok: false, error: `openai-http-${response.status}` };
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const critique = data.choices?.[0]?.message?.content?.trim();
    if (!critique) return { ok: false, error: "empty-response" };

    return { ok: true, critique, model: OPENAI_MODEL };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "network",
    };
  }
}
