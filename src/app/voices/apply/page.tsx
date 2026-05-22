import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Apply to write for Voices",
  description:
    "Apply to join Common Ground's community-contributor program and publish short essays on Voices.",
};

export default function VoicesApplyPage() {
  return (
    <div className="page-stack">
      <section className="panel page-hero">
        <p className="eyebrow">Voices</p>
        <h1>Apply to contribute</h1>
        <p className="page-copy">
          Voices is where vetted readers publish short essays. We accept
          first-person pieces, considered arguments, and quiet reflections
          tied to public life. Approval is at editor discretion.
        </p>
      </section>

      <section className="panel">
        <form id="voices-apply-form" className="voices-form">
          <label className="voices-field">
            <span>Display name</span>
            <input
              className="voices-input"
              name="displayName"
              maxLength={80}
              required
            />
          </label>
          <label className="voices-field">
            <span>What do you want to write about, and why is your perspective useful? (100-1500 chars)</span>
            <textarea
              className="voices-textarea"
              name="pitch"
              minLength={100}
              maxLength={1500}
              rows={6}
              required
            />
          </label>
          <label className="voices-field">
            <span>Prior writing or links (optional)</span>
            <textarea
              className="voices-textarea"
              name="priorWriting"
              maxLength={500}
              rows={3}
            />
          </label>
          <button className="button-primary" type="submit">Submit application</button>
          <p className="voices-status" id="voices-apply-status" aria-live="polite" />
        </form>
      </section>

      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function () {
              var form = document.getElementById('voices-apply-form');
              var status = document.getElementById('voices-apply-status');
              if (!form || !status) return;
              form.addEventListener('submit', function (event) {
                event.preventDefault();
                status.textContent = 'Submitting...';
                var data = {
                  displayName: form.displayName.value,
                  pitch: form.pitch.value,
                  priorWriting: form.priorWriting.value || undefined,
                };
                fetch('/api/voices/apply', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(data),
                }).then(function (resp) {
                  if (resp.status === 401) {
                    status.textContent = 'Please sign in first via /assistant.';
                    return;
                  }
                  if (resp.status === 429) {
                    status.textContent = 'You have already applied recently. Please wait.';
                    return;
                  }
                  if (!resp.ok) {
                    status.textContent = 'Submission failed. Please try again.';
                    return;
                  }
                  status.textContent = 'Application received. An editor will be in touch.';
                  form.reset();
                });
              });
            })();
          `,
        }}
      />
    </div>
  );
}
