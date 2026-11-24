import { useEffect, useRef, useState } from 'react';
import { Archive, ArchiveRestore, Copy, Link2, Link2Off, Loader2, Save, Sparkles, Trash2 } from 'lucide-react';
import { api } from '../api/client';
import { draftPayload, sameDraft, snapshotFromNote } from '../utils/notes';

export default function NoteEditor({ note, initialDraft, onDraftChange, onUpdate, onDelete, apiClient = api, demo = false }) {
  const [draft, setDraft] = useState(() => initialDraft || snapshotFromNote(note));
  const draftRef = useRef(draft);
  const mounted = useRef(true);
  const operation = useRef(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const isDirty = !sameDraft(draft, snapshotFromNote(note));
  const textChanged = draft.title !== note.title || draft.content !== note.content;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  function change(field, value) {
    const next = { ...draftRef.current, [field]: value };
    draftRef.current = next;
    setDraft(next);
    onDraftChange(note.note_id, next, snapshotFromNote(note));
  }

  async function persist() {
    const submitted = { ...draftRef.current };
    if (sameDraft(submitted, snapshotFromNote(note))) return note;
    const updated = await apiClient.updateNote(note.note_id, draftPayload(submitted));
    onUpdate(updated, submitted);
    // Only normalize the submitted version; preserve anything typed during this request.
    if (mounted.current && sameDraft(draftRef.current, submitted)) {
      const next = snapshotFromNote(updated);
      draftRef.current = next;
      setDraft(next);
      onDraftChange(note.note_id, next, next);
    }
    return updated;
  }

  async function perform(label, action) {
    if (operation.current) return;
    operation.current = true;
    setBusy(label);
    setError('');
    try {
      await action();
    } catch (failure) {
      if (mounted.current) setError(failure.message);
    } finally {
      operation.current = false;
      if (mounted.current) setBusy('');
    }
  }

  function save() {
    return perform('Saving…', persist);
  }

  useEffect(() => {
    const handler = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        if (isDirty) save();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  function analyze() {
    return perform('Analyzing…', async () => {
      const saved = await persist();
      const result = await apiClient.generateSummary(saved.note_id);
      onUpdate({ ...saved, summary: result.summary, action_items: result.action_items });
    });
  }

  function share() {
    if (!note.is_public && !window.confirm('Share this note publicly? Anyone with the link can read its content and your name.')) return;
    return perform('Updating sharing…', async () => {
      const saved = await persist();
      const updated = saved.is_public
        ? await apiClient.unshareNote(saved.note_id)
        : await apiClient.shareNote(saved.note_id);
      onUpdate(updated);
    });
  }

  function archive() {
    return perform('Updating archive…', async () => {
      const saved = await persist();
      onUpdate(await apiClient.updateNote(saved.note_id, { archived: !saved.archived }));
    });
  }

  function copyLink() {
    return perform('Copying…', async () => {
      const url = window.location.origin + window.location.pathname + '#/shared/' + note.share_id;
      await navigator.clipboard.writeText(url);
      if (mounted.current) setCopied(true);
    });
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--color-border)] px-4 py-3">
        <button type="button" onClick={save} disabled={Boolean(busy) || !isDirty} className="editor-button bg-indigo-600 text-white hover:bg-indigo-500">
          {busy === 'Saving…' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save
        </button>
        <button type="button" onClick={analyze} disabled={Boolean(busy)} className="editor-button bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20">
          <Sparkles className="h-4 w-4" /> AI Analyze
        </button>
        {!demo && <>
          <button type="button" onClick={share} disabled={Boolean(busy)} className="editor-button border border-[var(--color-border)] text-zinc-300">
            {note.is_public ? <Link2Off className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
            {note.is_public ? 'Unshare' : 'Share'}
          </button>
          {note.is_public && note.share_id && <button type="button" onClick={copyLink} disabled={Boolean(busy)} className="editor-button text-zinc-300"><Copy className="h-4 w-4" />{copied ? 'Copied!' : 'Copy link'}</button>}
        </>}
        <button type="button" onClick={archive} disabled={Boolean(busy)} className="editor-button text-zinc-300">
          {note.archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
          {note.archived ? 'Restore' : 'Archive'}
        </button>
        <button type="button" onClick={() => onDelete(note.note_id)} disabled={Boolean(busy)} className="editor-button ml-auto text-red-400 hover:bg-red-500/10"><Trash2 className="h-4 w-4" />Delete</button>
      </div>
      <div className="flex min-h-8 flex-wrap items-center gap-3 border-b border-[var(--color-border)] px-5 py-2 text-xs" role="status">
        {busy ? <span className="text-indigo-300">{busy}</span> : isDirty ? <span className="text-amber-300">Unsaved changes · drafts stay when you switch notes</span> : <span className="text-zinc-400">Saved {new Date(note.updated_at).toLocaleTimeString()}</span>}
        {demo && <span className="text-zinc-500">Local analysis · sample data resets on reload</span>}
      </div>
      {error && <p role="alert" className="mx-5 mt-4 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}
      <div className="flex-1 overflow-y-auto p-5 sm:p-8">
        <input aria-label="Note title" value={draft.title} onChange={(e) => change('title', e.target.value)} maxLength={200} placeholder="Note title" className="mb-6 w-full bg-transparent text-2xl font-semibold tracking-tight outline-none placeholder:text-zinc-600 sm:text-3xl" />
        <div className="mb-6 grid gap-3 sm:grid-cols-2">
          <input aria-label="Tags" value={draft.tags} onChange={(e) => change('tags', e.target.value)} placeholder="Tags (comma separated)" className="min-w-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-indigo-500" />
          <input aria-label="Category" value={draft.category} onChange={(e) => change('category', e.target.value)} maxLength={60} placeholder="Category" className="min-w-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-indigo-500" />
        </div>
        {!textChanged && note.summary && <section className="mb-6 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-5">
          <h2 className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-indigo-300"><Sparkles className="h-4 w-4" />{demo ? 'Local summary' : 'AI Summary'}</h2>
          <p className="text-sm leading-relaxed text-zinc-300">{note.summary}</p>
          {note.action_items?.length > 0 && <ul className="mt-4 space-y-2 border-t border-indigo-500/15 pt-4">{note.action_items.map((item, i) => <li key={i} className="flex gap-2 text-sm text-zinc-300"><span className="text-indigo-400">•</span>{item}</li>)}</ul>}
        </section>}
        <textarea aria-label="Note content" value={draft.content} onChange={(e) => change('content', e.target.value)} maxLength={50000} placeholder="Start writing…" className="min-h-[360px] w-full resize-none bg-transparent text-sm leading-7 text-zinc-300 outline-none placeholder:text-zinc-600" />
      </div>
    </div>
  );
}
