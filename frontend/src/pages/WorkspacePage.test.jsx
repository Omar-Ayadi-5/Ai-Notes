import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import WorkspacePage from './WorkspacePage';

const { api } = vi.hoisted(() => ({ api: { getNotes: vi.fn(), updateNote: vi.fn() } }));
vi.mock('../api/client', () => ({ api }));
vi.mock('../context/auth-context', () => ({ useAuth: () => ({ user: { name: 'Reviewer' }, logout: vi.fn() }) }));
const base = { tags: [], category: '', archived: false, updated_at: '2026-05-17T00:00:00Z' };
const notes = [{ ...base, note_id: 'A', title: 'Alpha', content: 'Saved A' }, { ...base, note_id: 'B', title: 'Beta', content: 'Saved B' }];

beforeEach(() => { api.getNotes.mockResolvedValue(notes); });

it('retains unsaved drafts when switching away and back', async () => {
  render(<MemoryRouter><WorkspacePage /></MemoryRouter>);
  await screen.findByDisplayValue('Saved A');
  fireEvent.change(screen.getByLabelText('Note content'), { target: { value: 'Unsaved A' } });
  fireEvent.click(screen.getByRole('button', { name: /Beta/ }));
  expect(screen.getByLabelText('Note content')).toHaveValue('Saved B');
  fireEvent.click(screen.getByRole('button', { name: /Alpha/ }));
  expect(screen.getByLabelText('Note content')).toHaveValue('Unsaved A');
  const event = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(true);
});

it('does not jump back to another note when its save finishes', async () => {
  let resolve;
  api.updateNote.mockReturnValue(new Promise((done) => { resolve = done; }));
  render(<MemoryRouter><WorkspacePage /></MemoryRouter>);
  await screen.findByDisplayValue('Saved A');
  fireEvent.change(screen.getByLabelText('Note content'), { target: { value: 'Submitted A' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save', exact: true }));
  fireEvent.click(screen.getByRole('button', { name: /Beta/ }));
  await act(async () => resolve({ ...notes[0], content: 'Submitted A' }));
  expect(screen.getByLabelText('Note title')).toHaveValue('Beta');
  expect(screen.getByLabelText('Note content')).toHaveValue('Saved B');
});
