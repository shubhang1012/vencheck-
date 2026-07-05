import { readFile } from "fs/promises";

/**
 * Extract text from a PDF file buffer
 */
export async function extractTextFromPDF(
  filePath: string
): Promise<string> {
  // Shim DOMMatrix globally for Node.js environment to prevent pdf-parse failures on serverless hosting platforms
  if (typeof globalThis.DOMMatrix === "undefined") {
    class MockDOMMatrix {
      a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
      constructor(init?: any) {
        if (Array.isArray(init)) {
          this.a = init[0]; this.b = init[1]; this.c = init[2]; this.d = init[3]; this.e = init[4]; this.f = init[5];
        }
      }
    }
    (globalThis as any).DOMMatrix = MockDOMMatrix;
    (globalThis as any).DOMMatrixReadOnly = MockDOMMatrix;
  }

  try {
    // Dynamically load pdfjs-dist and configure CDN worker location before loading pdf-parse
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.296/legacy/build/pdf.worker.min.mjs";

    const { PDFParse } = await import("pdf-parse");
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
