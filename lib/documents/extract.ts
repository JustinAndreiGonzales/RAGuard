import { extractPdf } from "./extraction/extractPdf";
import { extractDocx } from "./extraction/extractDocx";
import { extractTxtMd } from "./extraction/extractTxtMd";
import { FileType } from "@/types/fileType";

export function extractText(
  buffer: Buffer,
  fileType: FileType,
): Promise<string> {
  if (fileType === "pdf") return extractPdf(buffer);
  else if (fileType === "docx") return extractDocx(buffer);
  else return extractTxtMd(buffer);
}
