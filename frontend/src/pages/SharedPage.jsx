import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Calendar, Sparkles, Tag, User } from 'lucide-react';
import { api } from '../api/client';

export default function SharedPage() {
  const { shareId } = useParams();
  const [note, setNote] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getSharedNote(shareId)
      .then(setNote)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [shareId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-surface)]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !note) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-surface)] px-4 text-center">
        <Sparkles className="mb-4 h-10 w-10 text-zinc-600" />
        <h1 className="text-xl font-semibold">Note not found</h1>
        <p className="mt-2 text-zinc-500">{error || 'This shared link may have expired or been revoked.'}</p>
      </div>
    );
  }

  const updated = new Date(note.updated_at).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-6 py-4">
          <Sparkles className="h-5 w-5 text-indigo-400" />
          <span className="text-sm font-medium text-zinc-400">AI Notes · Shared</span>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="mb-4 text-3xl font-bold tracking-tight">{note.title || 'Untitled'}</h1>

        <div className="mb-8 flex flex-wrap items-center gap-4 text-sm text-zinc-500">
          <span className="flex items-center gap-1.5">
            <User className="h-4 w-4" />
            {note.author_name}
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            {updated}
          </span>
          {note.category && (
            <span className="rounded-full bg-indigo-500/10 px-3 py-0.5 text-indigo-300">
              {note.category}
            </span>
          )}
        </div>

        {note.tags?.length > 0 && (
          <div className="mb-8 flex flex-wrap gap-2">
            {note.tags.map((t) => (
              <span
                key={t}
                className="flex items-center gap-1 rounded-full border border-[var(--color-border)] px-3 py-1 text-xs text-zinc-400"
              >
                <Tag className="h-3 w-3" />
                {t}
              </span>
            ))}
          </div>
        )}

        {note.summary && (
          <div className="mb-8 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-5">
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-indigo-400">
              AI Summary
            </p>
            <p className="text-sm leading-relaxed text-zinc-300">{note.summary}</p>
          </div>
        )}

        <div className="prose prose-invert max-w-none whitespace-pre-wrap text-zinc-300 leading-relaxed">
          {note.content || <span className="text-zinc-600 italic">No content</span>}
        </div>
      </article>
    </div>
  );
}
