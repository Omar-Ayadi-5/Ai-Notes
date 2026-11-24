// Isolated, in-memory sample data. This module never calls the production API.
const now = new Date().toISOString();
const initialNotes = [
  {
    note_id: 'demo-launch', title: 'Launch plan · AI Notes', category: 'projects',
    tags: ['planning', 'product'],
    content: 'A focused workspace for ideas that deserve a next step.\n\nThis week\n- Review the first-time experience with three friends\n- Capture feedback on saving, search, and sharing\n- Write down what worked and what to improve\n\nKeep the scope small. A useful product starts with a clear problem and a few details done well.',
    summary: 'Prepare a small product review focused on the first-time experience. Collect feedback on the core note-taking flows and use it to choose the next improvements.',
    action_items: ['Review the first-time experience', 'Collect feedback on the core flows', 'Choose the next improvements'],
  },
  {
    note_id: 'demo-engineering', title: 'Engineering journal', category: 'learning', tags: ['engineering', 'ideas'],
    content: 'Good engineering decisions make the next change easier.\n\n- Keep authentication and note ownership on the server\n- Preserve drafts when a user switches context\n- Test slow responses as carefully as successful ones\n- Prefer a small, reproducible setup\n\nQuestion for the next review: which behavior would surprise someone using this for the first time?',
  },
  {
    note_id: 'demo-reading', title: 'Reading list & small discoveries', category: 'personal', tags: ['learning'],
    content: 'Things to explore when there is a quiet hour.\n\n- Read about accessible keyboard interactions\n- Sketch a better mobile writing experience\n- Try a new approach to organizing project notes\n\nSave useful observations here, one at a time.',
  },
  {
    note_id: 'demo-meeting', title: 'Weekly review', category: 'work', tags: ['planning'],
    content: 'What moved forward?\n\nThe first version is ready to try. The next step is to watch how someone else uses it.\n\n- Invite a teammate to a short walkthrough\n- Note where they hesitate\n- Pick one improvement for the next week',
  },
].map((note, index) => ({
  summary: null, action_items: [], archived: false, is_public: false,
  share_id: null, created_at: now, updated_at: new Date(Date.now() - index * 3600000).toISOString(), ...note,
}));

let notes = structuredClone(initialNotes);
const clone = (value) => structuredClone(value);

function find(id) {
  const note = notes.find((item) => item.note_id === id);
  if (!note) throw new Error('Note not found');
  return note;
}

export const demoApi = {
  async getNotes(params = {}) {
    const query = (params.q || '').toLowerCase();
    return clone(notes.filter((note) => note.archived === Boolean(params.archived)
      && (!params.tag || note.tags.includes(params.tag))
      && (!query || [note.title, note.content, ...note.tags].join(' ').toLowerCase().includes(query)))
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
      .slice(params.offset || 0, (params.offset || 0) + (params.limit || 100)));
  },
  async createNote(body) {
    const stamp = new Date().toISOString();
    const note = { ...clone(initialNotes[0]), ...body, note_id: crypto.randomUUID(), tags: [], category: '', summary: null, action_items: [], created_at: stamp, updated_at: stamp };
    notes = [note, ...notes];
    return clone(note);
  },
  async updateNote(id, body) {
    const note = find(id);
    if ((body.content !== undefined && body.content !== note.content) || (body.title !== undefined && body.title !== note.title)) {
      note.summary = null;
      note.action_items = [];
    }
    Object.assign(note, body, { updated_at: new Date().toISOString() });
    if (body.tags) note.tags = body.tags.map((tag) => tag.toLowerCase().trim());
    if (body.category !== undefined) note.category = body.category.toLowerCase().trim();
    return clone(note);
  },
  async deleteNote(id) { find(id); notes = notes.filter((note) => note.note_id !== id); },
  async generateSummary(id) {
    const note = find(id);
    const lines = note.content.split('\n').map((line) => line.trim()).filter(Boolean);
    const result = {
      summary: lines.slice(0, 3).join(' ').slice(0, 300) || 'Empty note.',
      action_items: lines.filter((line) => /^[-*•]\s/.test(line)).slice(0, 5).map((line) => line.slice(2)),
      suggested_title: note.title || lines[0]?.slice(0, 60) || 'Untitled',
    };
    Object.assign(note, result);
    return clone(result);
  },
  async getInsights() {
    const tags = {}, categories = {};
    for (const note of notes) {
      for (const tag of note.tags) tags[tag] = (tags[tag] || 0) + 1;
      const category = note.category || 'uncategorized';
      categories[category] = (categories[category] || 0) + 1;
    }
    return {
      total_notes: notes.length, archived_notes: notes.filter((note) => note.archived).length,
      notes_this_week: notes.filter((note) => Date.now() - new Date(note.created_at) < 7 * 86400000).length,
      top_tags: Object.entries(tags).map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count),
      notes_by_category: Object.entries(categories).map(([category, count]) => ({ category, count })),
      recent_activity: clone([...notes].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)).slice(0, 5)),
    };
  },
};
