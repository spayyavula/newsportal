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
            <section key={`${block.heading}-${index}`} className="article-section-block">
              <h2>{block.heading}</h2>
              <div dangerouslySetInnerHTML={{ __html: block.body }} />
            </section>
          );
        }

        if (block.type === "pull-quote") {
          return (
            <figure key={`${block.quote}-${index}`} className="article-pull-quote">
              <blockquote>{block.quote}</blockquote>
              <figcaption>
                {block.attribution}
                {block.role ? `, ${block.role}` : ""}
              </figcaption>
            </figure>
          );
        }

        return (
          <aside key={`${block.title}-${index}`} className="article-explainer">
            <p className="eyebrow">Explainer</p>
            <h2>{block.title}</h2>
            <p>{block.body}</p>
            <ul>
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
