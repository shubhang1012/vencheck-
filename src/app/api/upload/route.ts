import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { extractText } from "@/lib/documents/pdf-parser";
import { generateId } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const documentType = formData.get("documentType") as string | null;

    if (!file) {
      return Response.json(
        { error: "No file provided. Include a 'file' field in the form data." },
        { status: 400 }
      );
    }

    if (!documentType) {
      return Response.json(
        {
          error:
            "No documentType provided. Include a 'documentType' field in the form data.",
        },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return Response.json(
        { error: `File size exceeds maximum of 10MB. File size: ${(file.size / (1024 * 1024)).toFixed(2)}MB` },
        { status: 400 }
      );
    }

    // Validate MIME type
    const allowedMimes = [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/jpg",
      "text/plain",
      "application/json",
    ];
    if (!allowedMimes.includes(file.type)) {
      return Response.json(
        {
          error: `Unsupported file type: ${file.type}. Allowed: ${allowedMimes.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // On serverless environments (like Vercel), use the writable OS temporary directory /tmp
    const isServerless = process.env.VERCEL || process.env.NODE_ENV === "production";
    const uploadsDir = isServerless ? "/tmp" : join(process.cwd(), "public", "uploads");
    
    if (!isServerless) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const extension = file.name.split(".").pop() || "bin";
    const uniqueName = `${generateId()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const filePath = join(uploadsDir, uniqueName);
    const publicPath = `/uploads/${uniqueName}`;

    // Save file to disk
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    // Extract text from the file
    let extractedText = "";
    try {
      extractedText = await extractText(filePath, file.type);
    } catch (extractError) {
      console.error("Text extraction failed:", extractError);
      extractedText = "";
    }

    return Response.json(
      {
        success: true,
        file: {
          fileName: file.name,
          filePath: publicPath,
          absolutePath: filePath,
          mimeType: file.type,
          size: file.size,
          documentType,
          extractedText: extractedText || null,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Upload error:", error);
    return Response.json(
      {
        error: "Failed to upload file",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
