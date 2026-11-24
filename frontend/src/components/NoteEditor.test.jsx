import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NoteEditor from './NoteEditor';

const note = { note_id: 'A', title: 'Alpha', content: 'Saved content', tags: [], category: '', archived: false, updated_at: '2026-05-17T00:00:00Z' };
let client;
let props;
function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

beforeEach(() => {
  client = { updateNote: vi.fn(), generateSummary: vi.fn() };
  props = { note, apiClient: client, onDraftChange: vi.fn(), onUpdate: vi.fn(), onDelete: vi.fn() };
});

describe('editor regression checks', () => {
  it('preserves text typed after a save request starts', async () => {
    const pending = deferred();
    client.updateNote.mockReturnValue(pending.promise);
    render(<NoteEditor {...props} />);
    fireEvent.change(screen.getByLabelText('Note content'), { target: { value: 'Submitted version' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save', exact: true }));
    fireEvent.change(screen.getByLabelText('Note content'), { target: { value: 'Newer typing' } });
    await act(async () => pending.resolve({ ...note, content: 'Submitted version' }));
    expect(screen.getByLabelText('Note content')).toHaveValue('Newer typing');
    expect(props.onUpdate).toHaveBeenCalledWith(expect.objectContaining({ content: 'Submitted version' }), expect.objectContaining({ content: 'Submitted version' }));
  });

  it('cannot write a previous note response into a newly selected editor', async () => {
    const pending = deferred();
    client.updateNote.mockReturnValue(pending.promise);
    const { rerender } = render(<NoteEditor key="A" {...props} />);
    fireEvent.change(screen.getByLabelText('Note content'), { target: { value: 'Submitted A' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save', exact: true }));
    rerender(<NoteEditor key="B" {...props} note={{ ...note, note_id: 'B', title: 'Beta', content: 'Saved B' }} />);
    await act(async () => pending.resolve({ ...note, content: 'Submitted A' }));
    expect(screen.getByLabelText('Note content')).toHaveValue('Saved B');
  });

  it('saves the current draft before starting AI analysis', async () => {
    const pending = deferred();
    client.updateNote.mockReturnValue(pending.promise);
    client.generateSummary.mockResolvedValue({ summary: 'Current summary', action_items: [] });
    render(<NoteEditor {...props} />);
    fireEvent.change(screen.getByLabelText('Note content'), { target: { value: 'Latest draft' } });
    fireEvent.click(screen.getByRole('button', { name: 'AI Analyze' }));
    expect(client.generateSummary).not.toHaveBeenCalled();
    await act(async () => pending.resolve({ ...note, content: 'Latest draft' }));
    await waitFor(() => expect(client.generateSummary).toHaveBeenCalledWith('A'));
  });

  it('keeps drafts and displays a failed save inline', async () => {
    client.updateNote.mockRejectedValue(new Error('Server unavailable'));
    render(<NoteEditor {...props} />);
    fireEvent.change(screen.getByLabelText('Note content'), { target: { value: 'Keep this draft' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save', exact: true }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Server unavailable');
    expect(screen.getByLabelText('Note content')).toHaveValue('Keep this draft');
  });
});
