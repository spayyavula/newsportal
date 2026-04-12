import { NextResponse } from "next/server";
import {
  generateLlmReply,
  generateLlmReplyFromExternalResults,
} from "@/lib/assistant-llm";
import { getArticles, getTopics } from "@/lib/cms";
import { searchPersonalizedNewsWithExa } from "@/lib/exa-news";
import {
  buildAssistantReply,
  buildExternalAssistantReply,
  buildSuggestedPrompts,
  rankPersonalizedArticles,
  sanitizeProfile,
  type NewsAssistantRequest,
  type NewsAssistantResponse,
} from "@/lib/news-assistant";

export async function POST(request: Request) {
  let payload: NewsAssistantRequest | null = null;

  try {
    payload = (await request.json()) as NewsAssistantRequest;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const message = typeof payload?.message === "string" ? payload.message.trim() : "";
  const profile = sanitizeProfile(payload?.profile);

  const [articles, topics] = await Promise.all([
    getArticles({ fallbackToLocal: true }),
    getTopics({ fallbackToLocal: true }),
  ]);

  const externalResults = await searchPersonalizedNewsWithExa(message, profile, topics);

  if (externalResults.length > 0) {
    const llm = await generateLlmReplyFromExternalResults(message, profile, externalResults);
    const response: NewsAssistantResponse = {
      reply:
        llm.reply ?? buildExternalAssistantReply(externalResults, profile, message, topics),
      recommendations: [],
      externalResults,
      suggestedPrompts: buildSuggestedPrompts(profile, topics),
      summaryLabel: `${externalResults.length} Exa news matches`,
      citations: llm.citations,
      usedLlm: llm.usedLlm,
      model: llm.model,
    };

    return NextResponse.json(response);
  }

  const recommendations = rankPersonalizedArticles(articles, profile, message).slice(0, 4);
  const llm = await generateLlmReply(message, profile, recommendations);
  const response: NewsAssistantResponse = {
    reply: llm.reply ?? buildAssistantReply(recommendations, profile, message, topics),
    recommendations,
    externalResults: [],
    suggestedPrompts: buildSuggestedPrompts(profile, topics),
    summaryLabel:
      recommendations.length > 0
        ? `${recommendations.length} story matches`
        : "No matching stories",
    citations: llm.citations,
    usedLlm: llm.usedLlm,
    model: llm.model,
  };

  return NextResponse.json(response);
}