export function snapshotFromNote(note) {
  return {
    title: note.title || '',
    content: note.content || '',
    tags: (note.tags || []).join(', '),
    category: note.category || '',
  };
}

export function sameDraft(left, right) {
  return ['title', 'content', 'tags', 'category'].every((key) => left[key] === right[key]);
}

export function draftPayload(draft) {
  return {
    title: draft.title,
    content: draft.content,
    tags: draft.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
    category: draft.category,
  };
}
