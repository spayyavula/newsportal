import "server-only";
import * as Plot from "@observablehq/plot";
import { parseHTML } from "linkedom";
import type { ChartExhibit } from "@/content/site";

export const chartTheme = {
  fontFamily:
    'var(--font-newsreader), Georgia, "Times New Roman", serif',
  fontSize: 12,
  axisColor: "#888",
  textColor: "#222",
  seriesPalette: ["#c4a662", "#2f2f2f"],
  gridLineColor: "#e8e3d8",
};

type RenderOptions = {
  width?: number;
  height?: number;
  compact?: boolean;
};

function makeDocument(): Document {
  const { document } = parseHTML("<!DOCTYPE html><html><body></body></html>");
  return document as unknown as Document;
}

function buildMarks(exhibit: ChartExhibit) {
  const allPoints = exhibit.series.flatMap((s) =>
    s.data.map((point) => ({
      x: point.x,
      y: point.y,
      name: s.name,
    })),
  );

  switch (exhibit.chartType) {
    case "line":
      return [
        Plot.ruleY([0], { stroke: chartTheme.axisColor, strokeOpacity: 0.3 }),
        Plot.lineY(allPoints, {
          x: "x",
          y: "y",
          stroke: "name",
          strokeWidth: 1.6,
        }),
      ];
    case "area":
      return [
        Plot.ruleY([0], { stroke: chartTheme.axisColor, strokeOpacity: 0.3 }),
        Plot.areaY(allPoints, {
          x: "x",
          y: "y",
          fill: "name",
          fillOpacity: 0.2,
          stroke: "name",
          strokeWidth: 1.6,
        }),
      ];
    case "bar":
      return [
        Plot.barY(allPoints, {
          x: "x",
          y: "y",
          fill: "name",
          fx: "x",
        }),
      ];
    case "dot":
      return [
        Plot.dot(allPoints, {
          x: "x",
          y: "y",
          fill: "name",
          r: 5,
        }),
      ];
    case "stackedBar":
      return [
        Plot.barY(allPoints, {
          x: "x",
          y: "y",
          fill: "name",
        }),
      ];
  }
}

export function renderExhibitToSvg(
  exhibit: ChartExhibit,
  options: RenderOptions = {},
): string {
  const document = makeDocument();
  const width = options.width ?? (options.compact ? 320 : 720);
  const height = options.height ?? (options.compact ? 120 : 360);

  const chart = Plot.plot({
    document,
    width,
    height,
    style: {
      fontFamily: chartTheme.fontFamily,
      fontSize: `${chartTheme.fontSize}px`,
      color: chartTheme.textColor,
      background: "transparent",
    },
    color: {
      type: "categorical",
      range: chartTheme.seriesPalette,
    },
    x: {
      label: options.compact ? null : exhibit.xAxisLabel ?? null,
      grid: !options.compact,
    },
    y: {
      label: options.compact ? null : exhibit.yAxisLabel ?? null,
      grid: !options.compact,
    },
    marks: buildMarks(exhibit),
  });

  return (chart as unknown as Element).outerHTML;
}
