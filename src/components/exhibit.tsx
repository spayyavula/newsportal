import "server-only";
import type { ChartExhibit } from "@/content/site";
import { renderExhibitToSvg } from "@/lib/exhibits";

type ExhibitProps = {
  exhibit: ChartExhibit;
  variant?: "default" | "compact";
  className?: string;
};

export function Exhibit({ exhibit, variant = "default", className }: ExhibitProps) {
  const compact = variant === "compact";
  const svg = renderExhibitToSvg(exhibit, { compact });
  const ariaLabel = `${exhibit.title}. ${exhibit.sourceNote}`;
  const figureClass = `exhibit exhibit-${variant}${className ? ` ${className}` : ""}`;

  if (compact) {
    return (
      <div
        aria-label={ariaLabel}
        className={figureClass}
        role="img"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    );
  }

  return (
    <figure aria-label={ariaLabel} className={figureClass} role="img">
      <div className="exhibit-chart" dangerouslySetInnerHTML={{ __html: svg }} />
      <figcaption className="exhibit-caption">
        <strong>Exhibit {exhibit.figureNumber}.</strong> {exhibit.title}
        <span className="exhibit-source">{exhibit.sourceNote}</span>
      </figcaption>
    </figure>
  );
}
