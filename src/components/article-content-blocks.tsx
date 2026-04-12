import type { ArticleBlock } from "@/content/site";

type ArticleContentBlocksProps = {
  blocks: ArticleBlock[];
};

export function ArticleContentBlocks({ blocks }: ArticleContentBlocksProps) {
  if (blocks.length === 0) {
    return null;
  }

  return (
    <div className="article-blocks">
      {blocks.map((block, index) => {
        if (block.type === "section") {
          return (
            <section className="article-section-block" key={`${block.heading}-${index}`}>
              <h2>{block.heading}</h2>
              <div dangerouslySetInnerHTML={{ __html: block.body }} />
            </section>
          );
        }

        if (block.type === "pull-quote") {
          return (
            <figure className="article-pull-quote" key={`${block.quote}-${index}`}>
              <blockquote>{block.quote}</blockquote>
              <figcaption>
                {block.attribution}
                {block.role ? `, ${block.role}` : ""}
              </figcaption>
            </figure>
          );
        }

        return (
          <aside className="article-explainer" key={`${block.title}-${index}`}>
            <p className="card-kicker">Explainer</p>
            <h2>{block.title}</h2>
            <p>{block.body}</p>
            <ul className="plain-list">
              {block.keyPoints.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </aside>
        );
      })}
    </div>
  );
}
