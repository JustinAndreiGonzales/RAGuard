const MIN_TOTAL_CHARS = 20;

export function assertNonEmpty(text: string, context: string) {
  if (text.trim().length < MIN_TOTAL_CHARS) {
    throw new Error(`Extracted text is empty or near-empty (${context})`);
  }
}
