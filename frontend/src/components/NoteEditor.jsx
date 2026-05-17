import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Archive,
  ArchiveRestore,
  Copy,
  Link2,
  Link2Off,
  Loader2,
  Save,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { api } from '../api/client';

function snapshotFromNote(note) {
  return {
    title: note?.title || '',
    content: note?.content || '',
    tags: note?.tags?.join(', ') || '',
    category: note?.category || '',
  };
}

export default function NoteEditor({ note, onUpdate, onDelete }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [category, setCategory] = useState('');
  const [summary, setSummary] = useState('');
  const [actionItems, setActionItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const savedSnapshot = useRef({ title: '', content: '', tags: '', category: '' });

  const isDirty =
    title !== savedSnapshot.current.title ||
    content !== savedSnapshot.current.content ||
    tags !== savedSnapshot.current.tags ||
    category !== savedSnapshot.current.category;

  useEffect(() => {
    if (!note) return;
    const snap = snapshotFromNote(note);
    savedSnapshot.current = snap;
    setTitle(snap.title);
    setContent(snap.content);
    setTags(snap.tags);
    setCategory(snap.category);
    setSummary(note.summary || '');
    setActionItems(note.action_items || []);
    setLastSaved(note.updated_at ? new Date(note.updated_at) : null);
  }, [note?.note_id]);

  const save = useCallback(async () => {
    if (!note?.note_id || saving) return;
    setSaving(true);
    try {
      const tagList = tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const updated = await api.updateNote(note.note_id, {
        title,
        content,
        tags: tagList,
        category,
      });
      savedSnapshot.current = {
        title: updated.title ?? title,
        content: updated.content ?? content,
        tags: (updated.tags || []).join(', '),
        category: updated.category ?? category,
      };
      setTitle(savedSnapshot.current.title);
      setContent(savedSnapshot.current.content);
      setTags(savedSnapshot.current.tags);
      setCategory(savedSnapshot.current.category);
      onUpdate(updated);
      setLastSaved(new Date());
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }, [note?.note_id, title, content, tags, category, saving, onUpdate]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (note?.note_id && isDirty && !saving) save();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [note?.note_id, isDirty, saving, save]);

  const handleGenerateAI = async () => {
    setAiLoading(true);
    try {
      const result = await api.generateSummary(note.note_id);
      setSummary(result.summary);
      setActionItems(result.action_items);
      if (result.suggested_title && !title.trim()) {
        setTitle(result.suggested_title);
      }
      onUpdate({
        ...note,
        summary: result.summary,
        action_items: result.action_items,
        title: result.suggested_title && !title.trim() ? result.suggested_title : title,
      });
    } catch (e) {
      alert(e.message);
    } finally {
      setAiLoading(false);
    }
  };

  const handleShare = async () => {
    setShareLoading(true);
    try {
      const updated = note.is_public
        ? await api.unshareNote(note.note_id)
        : await api.shareNote(note.note_id);
      onUpdate(updated);
    } catch (e) {
      alert(e.message);
    } finally {
      setShareLoading(false);
    }
  };

  const copyShareLink = () => {
    const url = `${window.location.origin}${window.location.pathname}#/shared/${note.share_id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleArchive = async () => {
    const updated = await api.updateNote(note.note_id, { archived: !note.archived });
    onUpdate(updated);
  };

  if (!note) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center text-zinc-600">
        <Sparkles className="mb-3 h-10 w-10 opacity-40" />
        <p className="text-sm">Select a note or create a new one</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--color-border)] px-4 py-2">
        <button
          type="button"
          onClick={save}
          disabled={saving || !isDirty}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          {saving ? 'Saving…' : 'Save'}
        </button>

        {isDirty && !saving && (
          <span className="text-xs text-amber-400/90">Unsaved changes</span>
        )}

        <button
          type="button"
          onClick={handleGenerateAI}
          disabled={aiLoading}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600/20 px-3 py-1.5 text-xs font-medium text-indigo-300 transition hover:bg-indigo-600/30 disabled:opacity-50"
        >
          {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          AI Analyze
        </button>

        <button
          type="button"
          onClick={handleShare}
          disabled={shareLoading}
          className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-zinc-400 transition hover:text-zinc-200"
        >
          {note.is_public ? <Link2Off className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
          {note.is_public ? 'Unshare' : 'Share'}
        </button>

        {note.is_public && note.share_id && (
          <button
            type="button"
            onClick={copyShareLink}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-zinc-400 transition hover:text-zinc-200"
          >
            <Copy className="h-3.5 w-3.5" />
            {copied ? 'Copied!' : 'Copy link'}
          </button>
        )}

        <button
          type="button"
          onClick={toggleArchive}
          className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-zinc-400 transition hover:text-zinc-200"
        >
          {note.archived ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
          {note.archived ? 'Restore' : 'Archive'}
        </button>

        <button
          type="button"
          onClick={() => onDelete(note.note_id)}
          className="ml-auto flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-red-400 transition hover:bg-red-500/10"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </button>

        {!isDirty && lastSaved && (
          <span className="text-xs text-zinc-600">
            Saved {lastSaved.toLocaleTimeString()}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title"
          className="mb-4 w-full bg-transparent text-2xl font-semibold outline-none placeholder:text-zinc-600"
        />

        <div className="mb-4 flex gap-3">
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Tags (comma separated)"
            className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm outline-none focus:border-indigo-500"
          />
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Category"
            className="w-40 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm outline-none focus:border-indigo-500"
          />
        </div>

        {summary && (
          <div className="mb-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4">
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-indigo-400">
              AI Summary
            </p>
            <p className="text-sm text-zinc-300">{summary}</p>
          </div>
        )}

        {actionItems.length > 0 && (
          <div className="mb-4 rounded-xl border border-[var(--color-border)] p-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
              Action items
            </p>
            <ul className="space-y-1">
              {actionItems.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Start writing…"
          className="min-h-[300px] w-full resize-none bg-transparent text-sm leading-relaxed text-zinc-300 outline-none placeholder:text-zinc-600"
        />
      </div>
    </div>
  );
}
