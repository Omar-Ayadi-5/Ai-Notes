import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Calendar, Loader2, Search, Sparkles, Tag, User } from 'lucide-react';
import { api } from '../api/client';

function extractShareId(value) {
  const text = value.trim();
  if (!text) return '';

  const sharedMatch = text.match(/(?:#)?\/shared\/([^/?#\s]+)/i);
  if (sharedMatch?.[1]) return decodeURIComponent(sharedMatch[1]);

  try {
    const url = new URL(text);
    const hashMatch = url.hash.match(/\/shared\/([^/?#\s]+)/i);
    if (hashMatch?.[1]) return decodeURIComponent(hashMatch[1]);

    const pathMatch = url.pathname.match(/\/shared\/([^/?#\s]+)/i);
    if (pathMatch?.[1]) return decodeURIComponent(pathMatch[1]);
  } catch {
    // Plain share ids are accepted below.
  }

  return text.replace(/^#?\/?shared\/?/i, '').split(/[/?#\s]/)[0];
}

export default function SharedPage() {
  const { shareId } = useParams();
  const navigate = useNavigate();
  const [note, setNote] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(Boolean(shareId));
  const [sharedInput, setSharedInput] = useState('');

  const handleOpenShared = (e) => {
    e.preventDefault();
    const nextShareId = extractShareId(sharedInput);
    if (!nextShareId) {
      setError('Paste a shared link or share id.');
      return;
    }
    navigate(`/shared/${encodeURIComponent(nextShareId)}`);
  };

  useEffect(() => {
    if (!shareId) {
      return;
    }

    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setNote(null);
      setError('');
      setLoading(true);
      api
        .getSharedNote(shareId)
        .then((data) => {
          if (active) setNote(data);
        })
        .catch((e) => {
          if (active) setError(e.message);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    });

    return () => {
      active = false;
    };
  }, [shareId]);

  const displayError = shareId ? error : '';
  const showLookup = !shareId || displayError || (!loading && !note);
  const updated = note
    ? new Date(note.updated_at).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-400" />
            <span className="text-sm font-medium text-zinc-400">AI Notes / Shared</span>
          </div>
          <Link to="/login" className="text-xs text-zinc-500 hover:text-indigo-300">
            Sign in
          </Link>
        </div>
      </header>

      {showLookup && (
        <main className="mx-auto flex min-h-[calc(100vh-57px)] max-w-xl flex-col justify-center px-6 py-12">
          <div className="mb-6 text-center">
            <Sparkles className="mx-auto mb-4 h-10 w-10 text-indigo-400" />
            <h1 className="text-2xl font-semibold">Open shared note</h1>
            <p className="mt-2 text-sm text-zinc-500">
              Paste a shared note link or share id to view the public note.
            </p>
          </div>

          <form
            onSubmit={handleOpenShared}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4"
          >
            <label className="block">
              <span className="mb-2 block text-sm text-zinc-400">Shared link</span>
              <input
                type="text"
                value={sharedInput}
                onChange={(e) => setSharedInput(e.target.value)}
                placeholder="https://example.com/#/shared/abc123"
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
              />
            </label>

            {displayError && (
              <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {displayError}
              </p>
            )}

            <button
              type="submit"
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500"
            >
              <Search className="h-4 w-4" />
              Open note
            </button>
          </form>
        </main>
      )}

      {loading && (
        <div className="flex min-h-[calc(100vh-57px)] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
        </div>
      )}

      {!showLookup && !loading && note && (
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
            <div className="mb-8 rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-5">
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
      )}
    </div>
  );
}
