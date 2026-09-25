export function extractVideoId(input) {
  if (!input) return "";
  const trimmed = input.trim();
  const match = trimmed.match(/(?:v=|youtu\.be\/|embed\/|v\/|shorts\/)([\w-]{11})/);
  if (match) return match[1];
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;
  return trimmed;
}
