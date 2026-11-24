import { expect, it } from 'vitest';
import { extractShareId } from './share';

it('accepts share URLs and URL-safe IDs', () => {
  expect(extractShareId('https://example.com/Ai-Notes/#/shared/a-b_c')).toBe('a-b_c');
  expect(extractShareId('a-b_c')).toBe('a-b_c');
});

it('handles malformed URL encodings and paths without throwing', () => {
  expect(extractShareId('https://example.com/#/shared/%E0%A4')).toBe('');
  expect(extractShareId('/shared/%2Fprivate')).toBe('');
});
