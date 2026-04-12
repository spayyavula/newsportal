import Link from "next/link";

export function PreviewBanner() {
  return (
    <div className="preview-banner">
      <div className="preview-banner-inner">
        <p>Draft mode is enabled. You are reviewing unpublished article content.</p>
        <Link className="button-secondary" href="/api/draft/disable">
          Exit preview
        </Link>
      </div>
    </div>
  );
}
