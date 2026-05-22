import type { CSSProperties, ReactNode } from "react";

type OgCardProps = {
  kicker?: string;
  title: string;
  subtitle?: string;
};

const baseStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  background: "#fbf9f4",
  padding: 72,
  fontFamily: "Newsreader, Georgia, serif",
  color: "#111",
};

const kickerStyle: CSSProperties = {
  fontSize: 28,
  fontWeight: 700,
  letterSpacing: 8,
  textTransform: "uppercase",
  color: "#555",
  fontFamily: "sans-serif",
};

const titleStyle: CSSProperties = {
  fontSize: 72,
  lineHeight: 1.05,
  fontWeight: 500,
  letterSpacing: -1,
};

const subtitleStyle: CSSProperties = {
  fontSize: 32,
  color: "#444",
  marginTop: 12,
};

const brandRowStyle: CSSProperties = {
  display: "flex",
  borderTop: "1px solid rgba(17,17,17,0.2)",
  paddingTop: 24,
  fontSize: 28,
  letterSpacing: 4,
  textTransform: "uppercase",
  color: "#111",
  fontFamily: "sans-serif",
  fontWeight: 700,
};

export function OgCard({ kicker, title, subtitle }: OgCardProps): ReactNode {
  return (
    <div style={baseStyle}>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {kicker ? <div style={kickerStyle}>{kicker}</div> : null}
        <div style={titleStyle}>{title}</div>
        {subtitle ? <div style={subtitleStyle}>{subtitle}</div> : null}
      </div>
      <div style={brandRowStyle}>Common Ground</div>
    </div>
  );
}

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = "image/png";
