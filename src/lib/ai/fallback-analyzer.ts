import type { AIReviewResult, DocumentAnalysis, FieldMatchDetail } from "@/lib/types";
import { normalizeCompanyName } from "../validation/rules/company-name-match";

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
 * Normalize text for comparison: lowercase, remove extra spaces/punctuation
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Regexes for detecting tax IDs in text
const GST_REGEX = /[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}/i;
const EIN_REGEX = /\b\d{2}-\d{7}\b/;
const VAT_REGEX = /\bGB\d{9}\b/i;

function findOtherTaxId(text: string, vendorTaxId: string): string | null {
  const normalizedVendorTax = vendorTaxId.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  
  // Find all matches of GST pattern
  const gstMatch = text.match(GST_REGEX);
  if (gstMatch) {
    const found = gstMatch[0].replace(/[^A-Z0-9]/gi, "").toUpperCase();
    if (found !== normalizedVendorTax) return gstMatch[0];
  }

  // Find all matches of EIN pattern
  const einMatch = text.match(EIN_REGEX);
  if (einMatch) {
    const found = einMatch[0].replace(/[^A-Z0-9]/gi, "").toUpperCase();
    if (found !== normalizedVendorTax) return einMatch[0];
  }

  // Find all matches of VAT pattern
  const vatMatch = text.match(VAT_REGEX);
  if (vatMatch) {
    const found = vatMatch[0].replace(/[^A-Z0-9]/gi, "").toUpperCase();
    if (found !== normalizedVendorTax) return vatMatch[0];
  }

  return null;
}

/**
 * Check if a needle appears in a haystack (fuzzy substring search)
 */
function containsFuzzy(haystack: string, needle: string): boolean {
  if (!haystack || !needle) return false;
  const cleanNeedle = normalizeCompanyName(needle);
  const normHay = normalizeText(haystack);
  const normNeed = normalizeText(cleanNeedle);

  // Exact substring match
  if (normHay.includes(normNeed)) return true;

  const STOP_WORDS = new Set([
    "private",
    "limited",
    "pvt",
    "ltd",
    "company",
    "incorporated",
    "corporation",
    "inc",
    "corp",
    "llc",
    "llp",
    "co",
    "services",
    "solutions",
    "industries",
    "enterprises",
    "holdings",
    "group",
    "international",
    "intl",
    "and",
    "the",
  ]);

  // Word-level matching: check if most words from needle appear in haystack
  const allWords = normNeed.split(" ").filter((w) => w.length > 2);
  if (allWords.length === 0) return false;

  const coreWords = allWords.filter(w => !STOP_WORDS.has(w));
  const wordsToMatch = coreWords.length > 0 ? coreWords : allWords;

  let matchedWords = 0;
  for (const word of wordsToMatch) {
    if (normHay.includes(word)) {
      matchedWords++;
    }
  }

  return matchedWords / wordsToMatch.length >= 0.7;
}

/**
 * Calculate a similarity score between two strings (0-100)
 */
function textSimilarity(a: string, b: string): number {
  const normA = normalizeText(a);
  const normB = normalizeText(b);

  if (normA === normB) return 100;
  if (!normA || !normB) return 0;

  const wordsA = new Set(normA.split(" ").filter((w) => w.length > 1));
  const wordsB = new Set(normB.split(" ").filter((w) => w.length > 1));

  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let commonWords = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) commonWords++;
  }

  const jaccard =
    commonWords / (wordsA.size + wordsB.size - commonWords);
  return Math.round(jaccard * 100);
}

/**
 * Analyze a single document against vendor info
 */
function analyzeDocument(
  vendor: VendorInfo,
  doc: DocumentInfo
): DocumentAnalysis {
  const extractedText = doc.extractedText || "";
  const hasText = extractedText.trim().length > 0;

  if (!hasText) {
    return {
      documentType: doc.type,
      extractedText: "(no text available)",
      companyNameFound: false,
      matchScore: 0,
      confidence: 0.2,
    };
  }

  // Check for company name
  const companyNameFound =
    containsFuzzy(extractedText, vendor.companyName) ||
    containsFuzzy(extractedText, vendor.legalName);

  // Check for other identifiers
  const taxIdFound = normalizeText(extractedText).includes(
    normalizeText(vendor.taxId)
  );
  
  // Detect if there is a different tax ID in the document
  const otherTaxId = findOtherTaxId(extractedText, vendor.taxId);
  const taxIdMismatch = otherTaxId !== null;

  const regNumberFound = normalizeText(extractedText).includes(
    normalizeText(vendor.registrationNumber)
  );

  // Check if there is another registration number/CIN in the text
  const CIN_REGEX = /[L|U]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}/i;
  const matchCin = extractedText.match(CIN_REGEX);
  let regNumberMismatch = false;
  if (matchCin) {
    const foundCin = matchCin[0].replace(/[^A-Z0-9]/gi, "").toUpperCase();
    const vendorReg = vendor.registrationNumber.replace(/[^A-Z0-9]/gi, "").toUpperCase();
    if (foundCin !== vendorReg) {
      regNumberMismatch = true;
    }
  }

  // Calculate overall match score
  let score = 0;
  let checks = 0;

  // Company name: weighted heavily
  checks += 2;
  if (companyNameFound) {
    score += 2;
  }

  // Tax ID
  checks += 1;
  if (taxIdFound) {
    score += 1;
  } else if (taxIdMismatch) {
    score -= 2; // severe penalty for mismatching tax ID
  }

  // Registration number
  checks += 1;
  if (regNumberFound) {
    score += 1;
  } else if (regNumberMismatch) {
    score -= 2; // severe penalty for mismatching registration number
  }

  const matchScore = Math.max(0, Math.round((score / checks) * 100));

  // Confidence based on text length and matches
  let confidence: number;
  if (extractedText.length < 20) {
    confidence = 0.3;
  } else if (extractedText.length < 100) {
    confidence = 0.5;
  } else {
    confidence = 0.7 + (matchScore / 100) * 0.3;
  }

  return {
    documentType: doc.type,
    extractedText:
      extractedText.length > 200
        ? extractedText.substring(0, 200) + "..."
        : extractedText,
    companyNameFound,
    matchScore,
    confidence: Math.round(confidence * 100) / 100,
  };
}

function cleanCompanyName(name: string): string {
  let cleaned = name.trim();
  
  // List of noise prefixes to remove from the start of the name
  const noisePrefixes = [
    /^[-\s:]+/,
    /^not\s+valid/i,
    /^not/i,
    /^valid/i,
    /^business\s+license/i,
    /^business/i,
    /^account\s+holder/i,
    /^account/i,
    /^holder/i,
    /^company\s+name/i,
    /^company/i,
    /^legal\s+entity\s+name/i,
    /^legal\s+entity/i,
    /^legal\s+name/i,
    /^legal/i,
    /^field\s+value/i,
    /^field/i,
    /^value/i,
    /^dummy\s+document\s+for\s+testing\s+only/i,
    /^dummy\s+document/i,
    /^dummy/i,
    /^document/i,
    /^for\s+testing\s+only/i,
    /^testing/i,
    /^only/i,
    /^name/i,
    /^[-\s:]+/, // strip any remaining colons, dashes or spaces
  ];

  let changed = true;
  while (changed) {
    changed = false;
    for (const prefix of noisePrefixes) {
      const newVal = cleaned.replace(prefix, "").trim();
      if (newVal !== cleaned) {
        cleaned = newVal;
        changed = true;
      }
    }
  }

  return cleaned;
}

function extractOtherCompanyName(text: string, vendorName: string): string | null {
  const pattern = /([A-Z][a-zA-Z0-9&']+(?:\s+[A-Z][a-zA-Z0-9&']+)*)\s+(Private Limited|Pvt Ltd|Limited|Ltd|Inc|LLC|Corporation|Corp|Solutions)/g;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const found = cleanCompanyName((match[1] + " " + match[2]).trim());
    if (found.length > 2 && !containsFuzzy(found, vendorName)) {
      return found;
    }
  }
  return null;
}

function getFieldMatches(vendor: VendorInfo, documents: DocumentInfo[]): FieldMatchDetail[] {
  const matches: FieldMatchDetail[] = [];

  const addMatch = (
    fieldName: string,
    expected: string,
    found: string | null,
    status: "match" | "mismatch" | "not_found",
    reasoning: string,
    sourceDocument: string | null,
    isCritical: boolean
  ) => {
    matches.push({
      fieldName,
      expectedValue: expected,
      foundValue: found,
      status,
      reasoning,
      sourceDocument,
      isCritical
    });
  };

  const CRITICAL_FIELDS = new Set([
    "companyName",
    "legalName",
    "taxId",
    "registrationNumber",
    "pan",
    "bankAccountName",
    "bankAccountNumber",
    "ifscSwift"
  ]);

  const extractPan = (text: string): string | null => {
    const match = text.match(/[A-Z]{5}[0-9]{4}[A-Z]{1}/i);
    return match ? match[0].toUpperCase() : null;
  };

  const getExpectedPan = (taxId: string): string => {
    const cleanTax = taxId.replace(/[^A-Z0-9]/gi, "").toUpperCase();
    if (cleanTax.length === 15) {
      return cleanTax.substring(2, 12);
    }
    return cleanTax;
  };

  const checkField = (
    fieldName: string,
    expected: string,
    allowedDocTypes: string[],
    matchFn: (docText: string) => { found: string | null; status: "match" | "mismatch" | "not_found"; reasoning: string },
    defaultDocTypeLabel: string
  ) => {
    const isCritical = CRITICAL_FIELDS.has(fieldName);

    for (const doc of documents) {
      if (doc.extractedText && allowedDocTypes.includes(doc.type)) {
        const res = matchFn(doc.extractedText);
        if (res.status === "match" || res.status === "mismatch") {
          addMatch(fieldName, expected, res.found, res.status, res.reasoning, doc.fileName, isCritical);
          return;
        }
      }
    }

    for (const doc of documents) {
      if (doc.extractedText && !allowedDocTypes.includes(doc.type)) {
        const res = matchFn(doc.extractedText);
        if (res.status === "match") {
          addMatch(fieldName, expected, res.found, "match", res.reasoning, doc.fileName, isCritical);
          return;
        }
      }
    }

    const notFoundReason = isCritical
      ? `${fieldName.replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase())} not found in uploaded documents.`
      : `${fieldName.replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase())} not present in uploaded documents. No comparison performed. Informational field only.`;
    
    addMatch(fieldName, expected, null, "not_found", notFoundReason, null, isCritical);
  };

  // 1. Company Name
  checkField(
    "companyName",
    vendor.companyName,
    ["GST_CERTIFICATE", "CERTIFICATE_OF_INCORPORATION"],
    (text) => {
      const match = containsFuzzy(text, vendor.companyName);
      if (match) {
        return { found: vendor.companyName, status: "match", reasoning: "Company name found and matched." };
      }
      const other = extractOtherCompanyName(text, vendor.companyName);
      if (other) {
        return { found: other, status: "mismatch", reasoning: `Mismatched company name found in text: "${other}"` };
      }
      return { found: null, status: "not_found", reasoning: "" };
    },
    "Company Document"
  );

  // 2. Legal Name
  checkField(
    "legalName",
    vendor.legalName,
    ["CERTIFICATE_OF_INCORPORATION", "GST_CERTIFICATE"],
    (text) => {
      const match = containsFuzzy(text, vendor.legalName);
      if (match) {
        return { found: vendor.legalName, status: "match", reasoning: "Legal entity name matched." };
      }
      const other = extractOtherCompanyName(text, vendor.legalName);
      if (other) {
        return { found: other, status: "mismatch", reasoning: `Mismatched legal entity name found: "${other}"` };
      }
      return { found: null, status: "not_found", reasoning: "" };
    },
    "Incorporation Document"
  );

  // 3. Country
  checkField(
    "country",
    vendor.country,
    ["CERTIFICATE_OF_INCORPORATION", "GST_CERTIFICATE"],
    (text) => {
      const normText = normalizeText(text);
      const isFound = normText.includes(normalizeText(vendor.country));
      if (isFound) {
        return { found: vendor.country, status: "match", reasoning: "Country matches." };
      }
      const COUNTRIES = ["india", "united states", "usa", "united kingdom", "uk", "germany", "singapore", "canada"];
      const foundCountry = COUNTRIES.find(c => normText.includes(c));
      if (foundCountry) {
        const name = foundCountry.toUpperCase();
        return { found: name, status: "mismatch", reasoning: `Document references different country: "${name}"` };
      }
      return { found: null, status: "not_found", reasoning: "" };
    },
    "Company Document"
  );

  // 4. Registration Number (CIN)
  checkField(
    "registrationNumber",
    vendor.registrationNumber,
    ["CERTIFICATE_OF_INCORPORATION"],
    (text) => {
      const normText = normalizeText(text);
      const isFound = normText.includes(normalizeText(vendor.registrationNumber));
      if (isFound) {
        return { found: vendor.registrationNumber, status: "match", reasoning: "Registration number/CIN matched." };
      }
      const CIN_REGEX = /[L|U]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}/i;
      const match = text.match(CIN_REGEX);
      if (match) {
        return { found: match[0], status: "mismatch", reasoning: `Mismatched registration number (CIN) found: "${match[0]}"` };
      }
      return { found: null, status: "not_found", reasoning: "" };
    },
    "Incorporation Document"
  );

  // 5. Tax ID (GST)
  checkField(
    "taxId",
    vendor.taxId,
    ["GST_CERTIFICATE"],
    (text) => {
      const normText = normalizeText(text);
      const isFound = normText.includes(normalizeText(vendor.taxId));
      if (isFound) {
        return { found: vendor.taxId, status: "match", reasoning: "Tax ID/GST number matched." };
      }
      const otherTax = findOtherTaxId(text, vendor.taxId);
      if (otherTax) {
        return { found: otherTax, status: "mismatch", reasoning: `Mismatched Tax ID found: "${otherTax}"` };
      }
      return { found: null, status: "not_found", reasoning: "" };
    },
    "Tax Document"
  );

  // 6. PAN (derived or card)
  const expectedPan = getExpectedPan(vendor.taxId);
  checkField(
    "pan",
    expectedPan,
    ["PAN_CARD", "GST_CERTIFICATE"],
    (text) => {
      const docPan = extractPan(text);
      if (docPan) {
        if (docPan === expectedPan) {
          return { found: expectedPan, status: "match", reasoning: "PAN matches." };
        } else {
          return { found: docPan, status: "mismatch", reasoning: `Mismatched PAN found: "${docPan}"` };
        }
      }
      return { found: null, status: "not_found", reasoning: "" };
    },
    "PAN Card"
  );

  // 7. Address
  checkField(
    "address",
    vendor.address,
    ["GST_CERTIFICATE", "CERTIFICATE_OF_INCORPORATION"],
    (text) => {
      const isFound = containsFuzzy(text, vendor.address);
      if (isFound) {
        return { found: vendor.address, status: "match", reasoning: "Address matches." };
      }
      const zipMatch = text.match(/\b\d{5,6}\b/);
      const vendorZip = vendor.address.match(/\b\d{5,6}\b/);
      if (zipMatch && vendorZip && zipMatch[0] !== vendorZip[0]) {
        return { found: `ZIP: ${zipMatch[0]}`, status: "mismatch", reasoning: `Mismatched address/ZIP found: "${zipMatch[0]}"` };
      }
      return { found: null, status: "not_found", reasoning: "" };
    },
    "Company Document"
  );

  // 8. Email
  checkField(
    "email",
    vendor.email,
    ["GST_CERTIFICATE", "CERTIFICATE_OF_INCORPORATION"],
    (text) => {
      const isFound = text.toLowerCase().includes(vendor.email.toLowerCase());
      if (isFound) {
        return { found: vendor.email, status: "match", reasoning: "Email found and matched." };
      }
      const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
      const match = text.match(EMAIL_REGEX);
      if (match) {
        return { found: match[0], status: "mismatch", reasoning: `Mismatched contact email found: "${match[0]}"` };
      }
      return { found: null, status: "not_found", reasoning: "" };
    },
    "Company Document"
  );

  // 9. Phone
  checkField(
    "phone",
    vendor.phone,
    ["GST_CERTIFICATE"],
    (text) => {
      const cleanExpected = vendor.phone.replace(/\D/g, "");
      const cleanText = text.replace(/\D/g, "");
      if (cleanExpected.length > 5 && cleanText.includes(cleanExpected)) {
        return { found: vendor.phone, status: "match", reasoning: "Phone number matched." };
      }
      return { found: null, status: "not_found", reasoning: "" };
    },
    "Company Document"
  );

  // 10. Account Holder Name
  checkField(
    "bankAccountName",
    vendor.bankAccountName,
    ["CANCELLED_CHEQUE"],
    (text) => {
      const match = containsFuzzy(text, vendor.bankAccountName);
      if (match) {
        return { found: vendor.bankAccountName, status: "match", reasoning: "Account holder name matched." };
      }
      const other = extractOtherCompanyName(text, vendor.bankAccountName);
      if (other) {
        return { found: other, status: "mismatch", reasoning: `Mismatched account holder found: "${other}"` };
      }
      return { found: null, status: "not_found", reasoning: "" };
    },
    "Cancelled Cheque"
  );

  // 11. Account Number
  checkField(
    "bankAccountNumber",
    vendor.bankAccountNumber,
    ["CANCELLED_CHEQUE"],
    (text) => {
      const cleanExpected = vendor.bankAccountNumber.replace(/\s/g, "");
      const cleanText = text.replace(/\s/g, "");
      if (cleanText.includes(cleanExpected)) {
        return { found: vendor.bankAccountNumber, status: "match", reasoning: "Account number matched." };
      }
      const ACC_REGEX = /\b\d{9,18}\b/g;
      const matches = text.match(ACC_REGEX);
      if (matches) {
        const other = matches.find(m => m !== cleanExpected);
        if (other) {
          return { found: other, status: "mismatch", reasoning: `Mismatched account number found: "${other}"` };
        }
      }
      return { found: null, status: "not_found", reasoning: "" };
    },
    "Cancelled Cheque"
  );

  // 12. IFSC / SWIFT Code
  checkField(
    "ifscSwift",
    vendor.ifscSwift,
    ["CANCELLED_CHEQUE"],
    (text) => {
      const normText = normalizeText(text);
      const isFound = normText.includes(normalizeText(vendor.ifscSwift));
      if (isFound) {
        return { found: vendor.ifscSwift, status: "match", reasoning: "Routing code/IFSC matched." };
      }
      const IFSC_REGEX = /[A-Z]{4}0[A-Z0-9]{6}/gi;
      const match = text.match(IFSC_REGEX);
      if (match) {
        return { found: match[0].toUpperCase(), status: "mismatch", reasoning: `Mismatched IFSC code found: "${match[0].toUpperCase()}"` };
      }
      return { found: null, status: "not_found", reasoning: "" };
    },
    "Cancelled Cheque"
  );

  return matches;
}

/**
 * Deterministic document analysis fallback (no AI required).
 * Compares extracted text from documents against submitted vendor form data.
 */
export function analyzeWithFallback(
  vendor: VendorInfo,
  documents: DocumentInfo[]
): AIReviewResult {
  const documentAnalyses: DocumentAnalysis[] = [];
  let totalScore = 0;
  let totalConfidence = 0;
  let analyzedCount = 0;

  for (const doc of documents) {
    const analysis = analyzeDocument(vendor, doc);
    documentAnalyses.push(analysis);

    if (analysis.confidence > 0.2) {
      totalScore += analysis.matchScore;
      totalConfidence += analysis.confidence;
      analyzedCount++;
    }
  }

  const fieldMatches = getFieldMatches(vendor, documents);

  // Calculate score based on Critical fields
  const criticalMatches = fieldMatches.filter(f => f.isCritical && f.status === "match");
  const criticalMismatches = fieldMatches.filter(f => f.isCritical && f.status === "mismatch");
  const criticalPresent = fieldMatches.filter(f => f.isCritical && f.status !== "not_found");

  let avgScore = 100;
  if (criticalPresent.length > 0) {
    avgScore = Math.round((criticalMatches.length / criticalPresent.length) * 100);
  }

  // Determine status
  let status: "match" | "partial-match" | "mismatch";
  if (criticalMismatches.length > 0) {
    status = "mismatch";
  } else if (avgScore >= 80) {
    status = "match";
  } else {
    status = "partial-match";
  }

  // Cross Document Consistency Check
  const documentCompanies: Array<{ docType: string; docName: string; companyName: string | null }> = [];
  for (const doc of documents) {
    if (doc.extractedText) {
      let foundName: string | null = null;
      const namePattern = /([A-Z][a-zA-Z0-9&']+(?:\s+[A-Z][a-zA-Z0-9&']+)*)\s+(Private Limited|Pvt Ltd|Limited|Ltd|Inc|LLC|Corporation|Corp|Solutions)/g;
      const match = namePattern.exec(doc.extractedText);
      if (match) {
        foundName = cleanCompanyName(match[0].trim());
      } else {
        if (doc.extractedText.toLowerCase().includes(vendor.legalName.toLowerCase())) {
          foundName = vendor.legalName;
        } else if (doc.extractedText.toLowerCase().includes(vendor.companyName.toLowerCase())) {
          foundName = vendor.companyName;
        }
      }
      
      if (foundName) {
        documentCompanies.push({
          docType: doc.type,
          docName: doc.fileName,
          companyName: foundName
        });
      }
    }
  }

  let crossDocConsistencyStatus: "consistent" | "inconsistent" = "consistent";
  let crossDocConsistencyDetails = "All uploaded documents belong to the same organization. This demonstrates internal consistency among the uploaded documents.";

  if (documentCompanies.length > 1) {
    const firstCompany = documentCompanies[0].companyName!;
    for (let i = 1; i < documentCompanies.length; i++) {
      const otherCompany = documentCompanies[i].companyName!;
      if (!containsFuzzy(firstCompany, otherCompany) && !containsFuzzy(otherCompany, firstCompany)) {
        crossDocConsistencyStatus = "inconsistent";
        crossDocConsistencyDetails = `Inconsistent organization names found across documents. "${documentCompanies[0].docName}" references "${firstCompany}", but "${documentCompanies[i].docName}" references "${otherCompany}".`;
        break;
      }
    }
  }

  // OCR Transparency log
  const ocrTransparency = documents.map(doc => {
    const fieldsExtracted: string[] = [];
    const text = doc.extractedText || "";
    const hasText = text.trim().length > 0;

    if (hasText) {
      if (containsFuzzy(text, vendor.companyName) || extractOtherCompanyName(text, vendor.companyName)) {
        fieldsExtracted.push("Company Name");
      }
      if (containsFuzzy(text, vendor.legalName) || extractOtherCompanyName(text, vendor.legalName)) {
        fieldsExtracted.push("Legal Entity Name");
      }
      if (text.toLowerCase().includes(vendor.country.toLowerCase())) {
        fieldsExtracted.push("Country");
      }
      if (text.toLowerCase().includes(vendor.registrationNumber.toLowerCase()) || text.match(/[L|U]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}/i)) {
        fieldsExtracted.push("Registration Number (CIN)");
      }
      if (text.toLowerCase().includes(vendor.taxId.toLowerCase()) || findOtherTaxId(text, vendor.taxId)) {
        fieldsExtracted.push("Tax ID (GST Number)");
      }
      const match = text.match(/[A-Z]{5}[0-9]{4}[A-Z]{1}/i);
      if (match) {
        fieldsExtracted.push("PAN");
      }
      if (containsFuzzy(text, vendor.address) || text.match(/\b\d{5,6}\b/)) {
        fieldsExtracted.push("Address");
      }
      if (text.toLowerCase().includes(vendor.email.toLowerCase())) {
        fieldsExtracted.push("Email");
      }
      if (text.replace(/\D/g, "").includes(vendor.phone.replace(/\D/g, ""))) {
        fieldsExtracted.push("Phone");
      }
      if (containsFuzzy(text, vendor.bankAccountName) || extractOtherCompanyName(text, vendor.bankAccountName)) {
        fieldsExtracted.push("Bank Account Holder");
      }
      if (text.replace(/\s/g, "").includes(vendor.bankAccountNumber.replace(/\s/g, "")) || text.match(/\b\d{9,18}\b/)) {
        fieldsExtracted.push("Bank Account Number");
      }
      if (text.toLowerCase().includes(vendor.ifscSwift.toLowerCase()) || text.match(/[A-Z]{4}0[A-Z0-9]{6}/gi)) {
        fieldsExtracted.push("IFSC/SWIFT Code");
      }
    }

    return {
      fileName: doc.fileName,
      docType: doc.type,
      status: hasText ? "✓ Parsed Successfully" : "✗ Empty Document",
      fieldsExtracted: fieldsExtracted.length > 0 ? fieldsExtracted : ["None detected"]
    };
  });

  const verified = fieldMatches.length;
  const matched = fieldMatches.filter(f => f.status === "match").length;
  const mismatched = fieldMatches.filter(f => f.status === "mismatch").length;
  const notFound = fieldMatches.filter(f => f.status === "not_found").length;

  const reasoningParts: string[] = [];
  reasoningParts.push(
    `Document Verification Summary: Fields Verified: ${verified}, Matched: ${matched}, Mismatched: ${mismatched}, Not Found: ${notFound}.`
  );
  reasoningParts.push(`Overall Result: ${status.toUpperCase()}.`);

  if (status === "mismatch") {
    reasoningParts.push(
      `Critical mismatches: ${criticalMismatches.map(m => m.fieldName.replace(/([A-Z])/g, " $1")).join(", ")} differ from submitted values.`
    );
    reasoningParts.push("Recommendation: Reject vendor onboarding until corrected documents/details are submitted.");
  } else {
    reasoningParts.push("Recommendation: Approved or Pending review based on compliance guidelines.");
  }

  return {
    status,
    reasoning: reasoningParts.join("\n"),
    confidence: Math.round((analyzedCount > 0 ? totalConfidence / analyzedCount : 0.8) * 100) / 100,
    documentAnalyses,
    fieldMatches,
    crossDocConsistency: {
      status: crossDocConsistencyStatus,
      details: crossDocConsistencyDetails,
      documentCompanies
    },
    ocrTransparency
  };
}
