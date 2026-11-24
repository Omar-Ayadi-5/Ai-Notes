import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Archive, BarChart3, FileText, LogOut, Menu, Plus, Search, Sparkles, X } from 'lucide-react';
import { useAuth } from '../context/auth-context';
import { api } from '../api/client';
import { demoApi } from '../demo/api';
import { useDebounce } from '../hooks/useDebounce';
import { sameDraft } from '../utils/notes';
import { DEMO_ONLY } from '../config';
import NoteEditor from '../components/NoteEditor';
import InsightsPanel from '../components/InsightsPanel';

const PAGE_SIZE = 100;

export default function WorkspacePage({ demo = false }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const client = demo ? demoApi : api;
  const [notes, setNotes] = useState([]);
  const [selected, setSelected] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [reload, setReload] = useState(0);
  const [showInsights, setShowInsights] = useState(false);
  const [insights, setInsights] = useState(null);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const debouncedSearch = useDebounce(search, 300);
  const dirtyCount = Object.keys(drafts).length;

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    client.getNotes({
      q: debouncedSearch || undefined, tag: tagFilter || undefined,
      archived: showArchived, sort: 'updated_at', order: 'desc', limit: PAGE_SIZE, offset,
    }, { signal: controller.signal }).then((data) => {
      if (!active) return;
      setNotes((previous) => offset === 0 ? data : [...previous, ...data]);
      setHasMore(data.length === PAGE_SIZE);
      setError('');
      setSelected((previous) => previous || data[0] || null);
    }).catch((failure) => {
      if (active && failure.name !== 'AbortError') setError(failure.message);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [client, debouncedSearch, tagFilter, showArchived, offset, reload]);

  useEffect(() => {
    if (!dirtyCount) return;
    const warn = (event) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirtyCount]);

  const handleDraftChange = useCallback((id, draft, baseline) => {
    setDrafts((previous) => {
      const next = { ...previous };
      if (sameDraft(draft, baseline)) delete next[id];
      else next[id] = draft;
      return next;
    });
  }, []);

  const handleUpdate = useCallback((updated, submitted) => {
    setNotes((previous) => previous.map((item) => item.note_id === updated.note_id ? updated : item)
      .filter((item) => item.archived === showArchived)
      .sort((left, right) => new Date(right.updated_at) - new Date(left.updated_at)));
    // A response for another editor session can update the list without changing selection.
    setSelected((current) => current?.note_id === updated.note_id
      ? (updated.archived === showArchived ? updated : null) : current);
    if (submitted) setDrafts((previous) => {
      if (!previous[updated.note_id] || !sameDraft(previous[updated.note_id], submitted)) return previous;
      const next = { ...previous };
      delete next[updated.note_id];
      return next;
    });
  }, [showArchived]);

  async function createNote() {
    setError('');
    try {
      const note = await client.createNote({ title: 'Untitled', content: '' });
      setNotes((previous) => [note, ...previous.filter((item) => !item.archived)]);
      setShowArchived(false);
      setSelected(note);
      setSidebarOpen(false);
    } catch (failure) { setError(failure.message); }
  }

  async function deleteNote(id) {
    if (!window.confirm('Delete this note and its draft? This cannot be undone.')) return;
    try {
      await client.deleteNote(id);
      setNotes((previous) => previous.filter((item) => item.note_id !== id));
      setSelected((current) => current?.note_id === id ? null : current);
      setDrafts((previous) => { const next = { ...previous }; delete next[id]; return next; });
    } catch (failure) { setError(failure.message); }
  }

  async function loadInsights() {
    try {
      setInsights(await client.getInsights());
      setShowInsights(true);
      setSidebarOpen(false);
    } catch (failure) { setError(failure.message); }
  }

  function filter(update) {
    setLoading(true);
    setOffset(0);
    update();
  }

  function leave(event) {
    if (dirtyCount && !window.confirm('Leave this workspace and discard unsaved drafts?')) {
      event?.preventDefault();
      return false;
    }
    return true;
  }

  function signOut() {
    if (!leave()) return;
    if (!demo) logout();
    navigate('/login');
  }

  const allTags = [...new Set(notes.flatMap((item) => item.tags || []))];
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[var(--color-surface)]">
      {demo && <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-b border-indigo-500/20 bg-indigo-500/10 px-4 py-2 text-xs text-indigo-200">
        <span>Interactive demo · sample notes stay in this tab · no account or API key needed</span>
        {DEMO_ONLY ? <a href="https://github.com/Omar-Ayadi-5/Ai-Notes" className="font-semibold underline underline-offset-4">View the project</a> : <Link to="/signup" onClick={leave} className="font-semibold underline underline-offset-4">Create your workspace</Link>}
      </div>}
      <div className="flex min-h-0 flex-1">
        {sidebarOpen && <button aria-label="Close notes menu" className="fixed inset-0 z-20 bg-black/60 md:hidden" onClick={() => setSidebarOpen(false)} />}
        <aside className={(sidebarOpen ? 'flex' : 'hidden') + ' fixed inset-y-0 left-0 z-30 w-72 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface-elevated)] md:static md:flex'}>
          <div className="border-b border-[var(--color-border)] p-5">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-indigo-400" /><span className="font-semibold tracking-tight">AI Notes</span></div>
              {DEMO_ONLY ? <a href="https://github.com/Omar-Ayadi-5/Ai-Notes" title="View the project" className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800"><LogOut className="h-4 w-4" /></a> : <button type="button" onClick={signOut} title={demo ? 'Exit demo' : 'Logout'} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800"><LogOut className="h-4 w-4" /></button>}
            </div>
            <p className="mb-4 text-xs text-zinc-400">{demo ? 'Your sample workspace' : user?.name}</p>
            <div className="relative mb-4"><Search className="absolute left-3 top-3 h-4 w-4 text-zinc-500" /><input aria-label="Search notes" value={search} maxLength={200} onChange={(e) => filter(() => setSearch(e.target.value))} placeholder="Search notes…" className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] py-2.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-500" /></div>
            <div className="flex gap-2">
              <button type="button" onClick={createNote} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2.5 text-sm font-medium hover:bg-indigo-500"><Plus className="h-4 w-4" />New note</button>
              <button type="button" onClick={loadInsights} title="Insights" className="rounded-lg border border-[var(--color-border)] p-2.5 text-zinc-300"><BarChart3 className="h-4 w-4" /></button>
            </div>
            {!demo && <Link to="/shared" onClick={leave} className="mt-3 block text-center text-xs text-zinc-400 hover:text-indigo-300">Open a shared note</Link>}
          </div>
          <div className="flex flex-wrap gap-2 border-b border-[var(--color-border)] p-3">
            {[false, true].map((archived) => <button key={String(archived)} type="button" onClick={() => filter(() => { setShowArchived(archived); setSelected(null); })} className={'flex items-center gap-1 rounded-full px-3 py-1 text-xs ' + (showArchived === archived ? 'bg-indigo-500/20 text-indigo-200' : 'text-zinc-400 hover:text-zinc-200')}>{archived && <Archive className="h-3 w-3" />}{archived ? 'Archived' : 'Active'}</button>)}
            {allTags.slice(0, 5).map((tag) => <button key={tag} type="button" onClick={() => filter(() => setTagFilter(tagFilter === tag ? '' : tag))} className={'rounded-full px-2 py-1 text-xs ' + (tagFilter === tag ? 'bg-indigo-500/20 text-indigo-200' : 'text-zinc-500')}>#{tag}</button>)}
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading && offset === 0 ? <p className="p-6 text-sm text-zinc-500" role="status">Loading notes…</p> : notes.length === 0 ? <p className="p-6 text-sm text-zinc-500">No notes found. Create a note to get started.</p> : notes.map((item) => <button key={item.note_id} type="button" onClick={() => { setSelected(item); setSidebarOpen(false); }} className={'w-full border-b border-[var(--color-border)] px-5 py-4 text-left transition hover:bg-zinc-800/50 ' + (selected?.note_id === item.note_id ? 'border-l-2 border-l-indigo-400 bg-indigo-500/10' : '')}>
              <p className="mb-1 truncate text-sm font-medium">{item.title || 'Untitled'}{drafts[item.note_id] && <span className="ml-2 text-amber-400" aria-label="Unsaved draft">•</span>}</p>
              <p className="truncate text-xs text-zinc-500">{new Date(item.updated_at).toLocaleDateString()} · {item.category || 'Personal'}</p>
            </button>)}
            {hasMore && <button type="button" disabled={loading} onClick={() => { setLoading(true); setOffset((value) => value + PAGE_SIZE); }} className="w-full p-4 text-sm text-indigo-300">{loading ? 'Loading…' : 'Load more notes'}</button>}
          </div>
          <div className="border-t border-[var(--color-border)] px-5 py-3 text-xs text-zinc-500">{dirtyCount ? dirtyCount + ' unsaved draft' + (dirtyCount === 1 ? '' : 's') : 'A little space for your next idea.'}</div>
        </aside>
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex items-center gap-3 border-b border-[var(--color-border)] px-4 py-3 md:hidden"><button aria-label="Open notes menu" onClick={() => setSidebarOpen(true)}><Menu className="h-5 w-5" /></button><span className="truncate text-sm">{selected?.title || 'AI Notes'}</span></div>
          {error && <div role="alert" className="m-4 flex items-center gap-3 rounded-lg bg-red-500/10 p-3 text-sm text-red-300"><span className="flex-1">{error}</span><button onClick={() => { setLoading(true); setReload((value) => value + 1); }}>Retry</button><button aria-label="Dismiss error" onClick={() => setError('')}><X className="h-4 w-4" /></button></div>}
          {selected ? <NoteEditor key={selected.note_id} note={selected} initialDraft={drafts[selected.note_id]} onDraftChange={handleDraftChange} onUpdate={handleUpdate} onDelete={deleteNote} apiClient={client} demo={demo} /> : <div className="flex flex-1 flex-col items-center justify-center p-8 text-center"><FileText className="mb-4 h-12 w-12 text-indigo-400/50" /><h1 className="mb-2 text-xl font-semibold">Room for your next idea</h1><p className="max-w-sm text-sm leading-relaxed text-zinc-500">Choose a note, or start a fresh page. Organize your thoughts and turn them into your next steps.</p><button onClick={createNote} className="mt-6 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium">Create a note</button></div>}
        </main>
        {showInsights && <div className="fixed inset-y-0 right-0 z-40 flex shadow-2xl lg:static"><InsightsPanel insights={insights} onClose={() => setShowInsights(false)} /></div>}
      </div>
    </div>
  );
}
