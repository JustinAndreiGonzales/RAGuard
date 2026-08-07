import { assertNonEmpty } from "./assertNonEmpty";

export async function extractTxtMd(buffer: Buffer) {
  const trimmed = buffer.toString().trim();
  assertNonEmpty(trimmed, "txt/md");
  return trimmed;
}
