import { draftMode } from "next/headers";
import { NextResponse } from "next/server";
import { getArticleBySlug, hasCmsPreviewConfig } from "@/lib/cms";

function getArticleSlugFromPath(path: string) {
  const match = path.match(/^\/articles\/([^/?#]+)$/);
  return match?.[1] ?? null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  const slug = searchParams.get("slug");

  if (!hasCmsPreviewConfig() || secret !== process.env.NEXT_PREVIEW_SECRET || !slug) {
    return new NextResponse("Invalid preview request", { status: 401 });
  }

  const articleSlug = getArticleSlugFromPath(slug);

  if (!articleSlug) {
    return new NextResponse("Preview currently supports article pages only", {
      status: 400,
    });
  }

  const article = await getArticleBySlug(articleSlug, {
    preview: true,
    fallbackToLocal: false,
  });

  if (!article) {
    return new NextResponse("Invalid preview slug", { status: 401 });
  }

  const draft = await draftMode();
  draft.enable();

  return NextResponse.redirect(new URL(`/articles/${article.slug}`, request.url));
}
