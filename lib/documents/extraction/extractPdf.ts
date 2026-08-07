import { extractText, getDocumentProxy } from "unpdf";
import { assertNonEmpty } from "./assertNonEmpty";

const MIN_CHARS_PER_PAGE = 50;

export async function extractPdf(buffer: Buffer) {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { totalPages, text } = await extractText(pdf, { mergePages: true });

  const trimmed = text.trim();
  assertNonEmpty(trimmed, "pdf");

  const avgCharsPerPage = trimmed.length / totalPages;
  if (avgCharsPerPage < MIN_CHARS_PER_PAGE) {
    throw new Error(
      `Extracted text too sparse (${avgCharsPerPage.toFixed(0)} chars/page across ${totalPages} pages) - likely a scanned PDF with no text layer`,
    );
  }

  return trimmed;
}
