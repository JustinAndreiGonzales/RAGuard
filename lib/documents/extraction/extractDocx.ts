import mammoth from "mammoth";
import { assertNonEmpty } from "./assertNonEmpty";

export async function extractDocx(buffer: Buffer) {
  const result = await mammoth.extractRawText({ buffer });
  const trimmed = result.value.trim();
  assertNonEmpty(trimmed, "docx");
  return trimmed;
}
