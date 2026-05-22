import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { VoicesComposer } from "@/components/voices-composer";
import { getTopics } from "@/lib/cms";

export const metadata: Metadata = {
  title: "Compose a community contribution",
};

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL ?? process.env.STRAPI_URL;

function normaliseBaseUrl(url: string) {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

async function getCurrentUserAndRole(jwt: string) {
  if (!STRAPI_URL) return null;
  try {
    const response = await fetch(`${normaliseBaseUrl(STRAPI_URL)}/api/users/me?populate=role`, {
      headers: { Authorization: `Bearer ${jwt}` },
      cache: "no-store",
    });
    if (!response.ok) return null;
    return (await response.json()) as { id: number; email: string; role?: { name?: string } };
  } catch {
    return null;
  }
}

export default async function VoicesComposePage() {
  const cookieStore = await cookies();
  const sessionJwt = cookieStore.get("cg-reader-session")?.value;
  if (!sessionJwt) {
    redirect("/voices/apply");
  }

  const user = await getCurrentUserAndRole(sessionJwt);
  if (!user || user.role?.name !== "Contributor") {
    redirect("/voices/apply");
  }

  const topics = await getTopics();
  const topicOptions = topics.map((topic) => ({ slug: topic.slug, name: topic.name }));

  return (
    <div className="page-stack">
      <VoicesComposer userId={user.id} topicOptions={topicOptions} />
    </div>
  );
}
