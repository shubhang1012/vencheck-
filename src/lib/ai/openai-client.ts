import OpenAI from "openai";
import type { AIReviewResult, DocumentAnalysis } from "@/lib/types";

let openaiClient: OpenAI | null = null;

/**
 * Check if OpenAI API key is configured
 */
export function isOpenAIAvailable(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

/**
 * Get or create OpenAI client singleton
 */
function getClient(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY environment variable is not set");
    }
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

interface VendorInfo {
  companyName: string;
  legalName: string;
  country: string;
  registrationNumber: string;
  taxId: string;
  taxType: string;
  email: string;
  phone: string;
  address: string;
  bankAccountName: string;
  bankAccountNumber: string;
  ifscSwift: string;
}

interface DocumentInfo {
  type: string;
  fileName: string;
  extractedText?: string | null;
}

/**
 * Analyze document consistency using OpenAI
 */
export async function analyzeWithOpenAI(
  vendor: VendorInfo,
  documents: DocumentInfo[]
): Promise<AIReviewResult> {
  const client = getClient();

  // Build document summaries for the prompt
  const docSummaries = documents
    .map((doc) => {
      const textPreview = doc.extractedText
        ? doc.extractedText.substring(0, 1000)
        : "(no text extracted)";
      return `Document: ${doc.type} (${doc.fileName})\nExtracted Text: ${textPreview}`;
    })
    .join("\n\n");

  const prompt = `You are a compliance analyst reviewing vendor onboarding documents.

Vendor Information:
- Company Name: ${vendor.companyName}
- Legal Name: ${vendor.legalName}
- Country: ${vendor.country}
- Registration Number: ${vendor.registrationNumber}
- Tax ID: ${vendor.taxId}
- Tax Type: ${vendor.taxType}
- Email: ${vendor.email}
- Phone: ${vendor.phone}
- Address: ${vendor.address}
- Account Holder Name: ${vendor.bankAccountName}
- Account Number: ${vendor.bankAccountNumber}
- IFSC/SWIFT: ${vendor.ifscSwift}

Uploaded Documents:
${docSummaries}

Analyze the consistency between the vendor's submitted information and the extracted document text.
Extract each of the 12 fields from the documents (if mentioned) and check if it matches the entered value.
The 12 fields to check are:
1. Company Name (companyName)
2. Legal Entity Name (legalName)
3. Country (country)
4. Registration Number (registrationNumber)
5. Tax ID (taxId)
6. Tax Type (taxType)
7. Email (email)
8. Phone (phone)
9. Address (address)
10. Account Holder Name (bankAccountName)
11. Account Number (bankAccountNumber)
12. IFSC / SWIFT Code (ifscSwift)

Respond with a JSON object (no markdown fences):
{
  "status": "match" | "partial-match" | "mismatch",
  "reasoning": "Detailed explanation of findings",
  "confidence": 0.0 to 1.0,
  "fieldMatches": [
    {
      "fieldName": "companyName" | "legalName" | "country" | "registrationNumber" | "taxId" | "taxType" | "email" | "phone" | "address" | "bankAccountName" | "bankAccountNumber" | "ifscSwift",
      "expectedValue": "the entered value (e.g. ${vendor.companyName})",
      "foundValue": "value found in documents (or null if not found)",
      "status": "match" | "mismatch" | "not_found",
      "reasoning": "Brief explanation of how/where it matched or why it mismatched"
    }
  ],
  "documentAnalyses": [
    {
      "documentType": "TYPE",
      "extractedText": "brief summary of content",
      "companyNameFound": true/false,
      "matchScore": 0-100,
      "confidence": 0.0 to 1.0
    }
  ]
}`;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a compliance document analyzer. Respond only with valid JSON, no markdown code fences.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.1,
      max_tokens: 1500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    // Clean potential markdown fences
    const cleaned = content
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    const parsed = JSON.parse(cleaned) as AIReviewResult;

    // Validate the response structure
    if (
      !parsed.status ||
      !["match", "partial-match", "mismatch"].includes(parsed.status)
    ) {
      throw new Error(`Invalid status in AI response: ${parsed.status}`);
    }

    return {
      status: parsed.status,
      reasoning: parsed.reasoning || "AI analysis completed.",
      confidence:
        typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
      documentAnalyses: Array.isArray(parsed.documentAnalyses)
        ? parsed.documentAnalyses
        : [],
      fieldMatches: Array.isArray(parsed.fieldMatches)
        ? parsed.fieldMatches
        : [],
    };
  } catch (error) {
    // Re-throw to let the caller handle fallback
    throw new Error(
      `OpenAI analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
