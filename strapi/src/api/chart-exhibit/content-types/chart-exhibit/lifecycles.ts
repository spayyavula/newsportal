type SeriesPoint = { x: number | string; y: number };
type SeriesEntry = { name: string; data: SeriesPoint[] };

function isSeriesShape(value: unknown): value is SeriesEntry[] {
  if (!Array.isArray(value)) {
    return false;
  }

  return value.every((entry) => {
    if (!entry || typeof entry !== "object") return false;
    const candidate = entry as Record<string, unknown>;
    if (typeof candidate.name !== "string") return false;
    if (!Array.isArray(candidate.data)) return false;
    return candidate.data.every((point) => {
      if (!point || typeof point !== "object") return false;
      const cast = point as Record<string, unknown>;
      const xOk = typeof cast.x === "number" || typeof cast.x === "string";
      const yOk = typeof cast.y === "number";
      return xOk && yOk;
    });
  });
}

export default {
  beforeCreate(event: { params: { data: { series?: unknown } } }) {
    const series = event.params.data.series;
    if (!isSeriesShape(series)) {
      throw new Error(
        "chart-exhibit.series must be: [{ name: string, data: [{ x: number|string, y: number }, ...] }, ...]",
      );
    }
  },
  beforeUpdate(event: { params: { data: { series?: unknown } } }) {
    const series = event.params.data.series;
    if (series !== undefined && !isSeriesShape(series)) {
      throw new Error(
        "chart-exhibit.series must be: [{ name: string, data: [{ x: number|string, y: number }, ...] }, ...]",
      );
    }
  },
};
