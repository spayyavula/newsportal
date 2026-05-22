import type { PodcastRecommendation } from "@/content/site";

type PodcastRecommendationProps = {
  podcast: PodcastRecommendation;
  variant?: "card" | "brief";
};

export function PodcastRecommendationCard({
  podcast,
  variant = "card",
}: PodcastRecommendationProps) {
  return (
    <article className={`podcast-recommendation podcast-recommendation-${variant}`}>
      <p className="podcast-recommendation-show">{podcast.showName}</p>
      <h3 className="podcast-recommendation-episode">{podcast.episodeTitle}</h3>
      {podcast.host ? (
        <p className="podcast-recommendation-host">Hosted by {podcast.host}</p>
      ) : null}
      <p className="podcast-recommendation-meta">{podcast.durationMinutes} min listen</p>
      <p className="podcast-recommendation-summary">{podcast.summary}</p>
      <a
        className="button-secondary podcast-recommendation-listen"
        href={podcast.listenUrl}
        rel="noopener noreferrer"
        target="_blank"
      >
        Listen
      </a>
    </article>
  );
}
