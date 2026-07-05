import { readFile } from "fs/promises";
import { PDFParse } from "pdf-parse";

/**
 * Extract text from a PDF file buffer
 */
export async function extractTextFromPDF(
  filePath: string
): Promise<string> {
  try {
    const buffer = await readFile(filePath);
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const result = await parser.getText();
    return result.text.trim();
  } catch (error) {
    console.error(
      `PDF parsing error for ${filePath}:`,
      error instanceof Error ? error.message : error
    );
    return "";
  }
}

/**
 * Extract text from a text file
 */
export async function extractTextFromTextFile(
  filePath: string
): Promise<string> {
  try {
    const content = await readFile(filePath, "utf-8");
    return content.trim();
  } catch (error) {
    console.error(
      `Text file read error for ${filePath}:`,
      error instanceof Error ? error.message : error
    );
    return "";
  }
}

/**
 * Extract text from a file based on its MIME type.
 * Supports PDF, text files, and returns placeholder for images.
 */
export async function extractText(
  filePath: string,
  mimeType: string
): Promise<string> {
  const normalizedMime = mimeType.toLowerCase();

  if (normalizedMime === "application/pdf") {
    return extractTextFromPDF(filePath);
  }

  if (
    normalizedMime.startsWith("text/") ||
    normalizedMime === "application/json" ||
    normalizedMime === "application/xml"
  ) {
    return extractTextFromTextFile(filePath);
  }

  if (normalizedMime.startsWith("image/")) {
    // OCR is too heavy for this context; return a placeholder
    return "[Image document — OCR text extraction not available. Manual review required.]";
  }

  // Unknown type
  return `[Unsupported file type: ${mimeType}. Text extraction not available.]`;
}
