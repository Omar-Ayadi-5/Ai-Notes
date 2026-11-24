export function extractShareId(value) {
  const text = value.trim();
  if (!text) return '';
  try {
    const match = text.match(/(?:#)?\/shared\/([^/?#\s]+)/i);
    const candidate = decodeURIComponent(match ? match[1] : text);
    return /^[A-Za-z0-9_-]{1,128}$/.test(candidate) ? candidate : '';
  } catch {
    return '';
  }
}
