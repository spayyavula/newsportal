import type { SourceNote } from "@/content/site";

type SourceNotesProps = {
  notes: SourceNote[];
};

export function SourceNotes({ notes }: SourceNotesProps) {
  if (notes.length === 0) {
    return null;
  }

  return (
    <section className="source-notes">
      <p className="eyebrow">Source notes</p>
      <ol className="source-notes-list">
        {notes.map((note, index) => (
          <li key={`note-${index}-${note.text.slice(0, 24)}`} className="source-notes-item">
            {note.url ? (
              <a href={note.url} rel="noreferrer" target="_blank">
                {note.text}
              </a>
            ) : (
              note.text
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
