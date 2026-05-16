import { useCallback, useEffect, useState } from 'react';
import {
  Archive,
  BarChart3,
  LogOut,
  Plus,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { useDebounce } from '../hooks/useDebounce';
import NoteEditor from '../components/NoteEditor';
import InsightsPanel from '../components/InsightsPanel';

export default function WorkspacePage() {
  const { user, logout } = useAuth();
  const [notes, setNotes] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showInsights, setShowInsights] = useState(false);
  const [insights, setInsights] = useState(null);
  const debouncedSearch = useDebounce(search, 300);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getNotes({
        q: debouncedSearch || undefined,
        tag: tagFilter || undefined,
        archived: showArchived,
        sort: 'updated_at',
        order: 'desc',
      });
      setNotes(data);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, tagFilter, showArchived]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const loadInsights = async () => {
    const data = await api.getInsights();
    setInsights(data);
    setShowInsights(true);
  };

  const handleCreate = async () => {
    const note = await api.createNote({ title: 'Untitled', content: '' });
    setNotes((prev) => [note, ...prev]);
    setSelected(note);
  };

  const handleUpdate = (updated) => {
    setNotes((prev) => prev.map((n) => (n.note_id === updated.note_id ? updated : n)));
    setSelected(updated);
    if (updated.archived && !showArchived) {
      setSelected(null);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this note?')) return;
    await api.deleteNote(id);
    setNotes((prev) => prev.filter((n) => n.note_id !== id));
    if (selected?.note_id === id) setSelected(null);
  };

  const allTags = [...new Set(notes.flatMap((n) => n.tags || []))];

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-surface)]">
      {/* Sidebar */}
      <aside className="flex w-72 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
        <div className="border-b border-[var(--color-border)] p-4">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-400" />
              <span className="font-semibold">AI Notes</span>
            </div>
            <button
              type="button"
              onClick={logout}
              className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
          <p className="mb-3 truncate text-xs text-zinc-500">{user?.name}</p>

          <div className="relative mb-3">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notes…"
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] py-2 pl-8 pr-8 text-sm outline-none focus:border-indigo-500"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-2 text-zinc-500 hover:text-zinc-300"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCreate}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 py-2 text-xs font-medium text-white hover:bg-indigo-500"
            >
              <Plus className="h-3.5 w-3.5" />
              New note
            </button>
            <button
              type="button"
              onClick={loadInsights}
              className="rounded-lg border border-[var(--color-border)] px-2.5 py-2 text-zinc-400 hover:text-zinc-200"
              title="Insights"
            >
              <BarChart3 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 border-b border-[var(--color-border)] px-3 py-2">
          <button
            type="button"
            onClick={() => setShowArchived(false)}
            className={`rounded-full px-2.5 py-0.5 text-xs ${!showArchived ? 'bg-indigo-600/30 text-indigo-300' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Active
          </button>
          <button
            type="button"
            onClick={() => setShowArchived(true)}
            className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs ${showArchived ? 'bg-indigo-600/30 text-indigo-300' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <Archive className="h-3 w-3" />
            Archived
          </button>
          {allTags.slice(0, 6).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTagFilter(tagFilter === t ? '' : t)}
              className={`rounded-full px-2.5 py-0.5 text-xs ${tagFilter === t ? 'bg-indigo-600/30 text-indigo-300' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              #{t}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            </div>
          ) : notes.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-zinc-600">No notes found</p>
          ) : (
            notes.map((n) => (
              <button
                key={n.note_id}
                type="button"
                onClick={() => setSelected(n)}
                className={`w-full border-b border-[var(--color-border)] px-4 py-3 text-left transition hover:bg-zinc-800/50 ${
                  selected?.note_id === n.note_id ? 'bg-indigo-600/10 border-l-2 border-l-indigo-500' : ''
                }`}
              >
                <p className="truncate text-sm font-medium">{n.title || 'Untitled'}</p>
                <p className="mt-0.5 truncate text-xs text-zinc-500">
                  {new Date(n.updated_at).toLocaleDateString()}
                  {n.tags?.length > 0 && ` · ${n.tags.slice(0, 2).join(', ')}`}
                </p>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Editor */}
      <main className="flex flex-1 flex-col overflow-hidden">
        <NoteEditor
          note={selected}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      </main>

      {showInsights && (
        <InsightsPanel insights={insights} onClose={() => setShowInsights(false)} />
      )}
    </div>
  );
}
