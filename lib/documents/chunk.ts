const SEPARATORS = ["\n\n", "\n", ". ", "! ", "? "];

export function chunkText(
  text: string,
  { targetChars = 2000, overlapChars = 200 },
): string[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const pieces = splitToSize(normalized, targetChars, 0);
  return applyOverlap(pieces, overlapChars);
}

// Recursively splits `text` into pieces <= targetChars, trying each
// separator in priority order before falling back to a hard cutoff.
function splitToSize(
  text: string,
  targetChars: number,
  sepIndex: number,
): string[] {
  if (text.length <= targetChars) return [text];

  if (sepIndex >= SEPARATORS.length) {
    const out: string[] = [];
    for (let i = 0; i < text.length; i += targetChars) {
      out.push(text.slice(i, i + targetChars));
    }
    return out;
  }

  const sep = SEPARATORS[sepIndex];
  const parts = text.split(sep).filter((p) => p.length > 0);

  if (parts.length <= 1) {
    return splitToSize(text, targetChars, sepIndex + 1);
  }

  // Greedily pack parts back together up to targetChars.
  const packed: string[] = [];
  let current = "";
  for (const part of parts) {
    const candidate = current ? current + sep + part : part;
    if (candidate.length > targetChars && current) {
      packed.push(current);
      current = part;
    } else {
      current = candidate;
    }
  }
  if (current) packed.push(current);

  // Any packed piece still too big gets recursively split with the next separator.
  return packed.flatMap((piece) =>
    piece.length > targetChars
      ? splitToSize(piece, targetChars, sepIndex + 1)
      : piece,
  );
}

// Prepends the tail of the previous chunk so consecutive chunks overlap
// by ~overlapChars, preserving context across a chunk boundary.
function applyOverlap(pieces: string[], overlapChars: number): string[] {
  if (pieces.length <= 1 || overlapChars <= 0) return pieces;

  return pieces.map((piece, i) => {
    if (i === 0) return piece;
    const prevTail = pieces[i - 1].slice(-overlapChars);
    return prevTail + piece;
  });
}
