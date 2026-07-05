import { readFile } from "fs/promises";

async function main() {
  console.log("🔍 Checking pdfjs-dist legacy entry points...");
  try {
    const pdfjs = require("pdfjs-dist/legacy/build/pdf.cjs");
    console.log("✅ Successfully loaded pdf.cjs!");
    console.log("Worker status:", pdfjs.GlobalWorkerOptions.workerSrc);
  } catch (e) {
    console.error("❌ Failed to load pdf.cjs:", e);
  }
}

main();
