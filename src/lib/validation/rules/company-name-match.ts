import type { RuleResult, ValidationStepStatus } from "@/lib/types";

// ── Abbreviation normalization map ──
const ABBREVIATIONS: Record<string, string> = {
  pvt: "private",
  ltd: "limited",
  inc: "incorporated",
  corp: "corporation",
  llc: "limited liability company",
  llp: "limited liability partnership",
  co: "company",
  intl: "international",
  svc: "services",
  svcs: "services",
  tech: "technology",
  sys: "systems",
  mgmt: "management",
  mfg: "manufacturing",
  assoc: "associates",
  bros: "brothers",
  grp: "group",
  hldgs: "holdings",
  ent: "enterprises",
  ind: "industries",
};

export function normalizeCompanyName(name: string): string {
  let normalized = name.toLowerCase().trim();

  // Remove punctuation (periods, commas, dashes, parentheses, brackets)
  normalized = normalized.replace(/[.,\-()\[\]]/g, " ");

  // Collapse multiple spaces to single spaces
  normalized = normalized.replace(/\s+/g, " ").trim();

  // Suffixes to remove from the end of the string
  const suffixes = [
    /\bprivate\s+limited\b/gi,
    /\bprivate\s+ltd\b/gi,
    /\bpvt\s+ltd\b/gi,
    /\bpte\s+ltd\b/gi,
    /\blimited\b/gi,
    /\bltd\b/gi,
    /\bllp\b/gi,
    /\bllc\b/gi,
    /\bincorporated\b/gi,
    /\binc\b/gi,
    /\bcorporation\b/gi,
    /\bcorp\b/gi,
    /\bcompany\b/gi,
    /\bco\b/gi,
    /\bplc\b/gi,
    /\bgmbh\b/gi,
    /\bsa\b/gi,
    /\bag\b/gi,
  ];

  let changed = true;
  while (changed) {
    changed = false;
    for (const suffix of suffixes) {
      const endPattern = new RegExp(suffix.source + "$", "i");
      const newVal = normalized.replace(endPattern, "").trim();
      if (newVal !== normalized) {
        normalized = newVal;
        changed = true;
      }
    }
  }

  // Expand remaining abbreviations
  const words = normalized.split(/\s+/);
  const expanded = words.map((word) => {
    const clean = word.replace(/[^a-z0-9]/g, "");
    return ABBREVIATIONS[clean] || clean;
  });

  return expanded.filter((w) => w.length > 0).join(" ");
}

/**
 * Compute Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  // Use two-row optimization for memory efficiency
  let prev = new Array(n + 1);
  let curr = new Array(n + 1);

  for (let j = 0; j <= n; j++) {
    prev[j] = j;
  }

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        curr[j] = prev[j - 1];
      } else {
        curr[j] = 1 + Math.min(prev[j], curr[j - 1], prev[j - 1]);
      }
    }
    [prev, curr] = [curr, prev];
  }

  return prev[n];
}

/**
 * Compute similarity percentage based on Levenshtein distance
 */
function similarityScore(a: string, b: string): number {
  if (a === b) return 100;
  if (a.length === 0 || b.length === 0) return 0;

  const distance = levenshteinDistance(a, b);
  const maxLen = Math.max(a.length, b.length);
  let score = Math.round(((maxLen - distance) / maxLen) * 100);

  // If one company name is a substring of the other (e.g. "NexGen Analytics" inside "NexGen Analytics Solutions")
  // we guarantee a similarity score of at least 80% so it flags a WARNING (Partial Match).
  if (a.includes(b) || b.includes(a)) {
    score = Math.max(score, 80);
  }

  return score;
}

/**
 * Compare two company names with normalization and fuzzy matching
 */
export function compareCompanyNames(
  name1: string,
  name2: string
): { score: number; normalizedName1: string; normalizedName2: string } {
  const normalizedName1 = normalizeCompanyName(name1);
  const normalizedName2 = normalizeCompanyName(name2);
  const score = similarityScore(normalizedName1, normalizedName2);
  return { score, normalizedName1, normalizedName2 };
}

/**
 * Validate that companyName and legalName match
 */
export function validateCompanyNameMatch(
  companyName: string,
  legalName: string
): RuleResult {
  if (!companyName || !legalName) {
    return {
      stepName: "Company Name Match",
      status: "SKIPPED",
      message:
        "Cannot compare names: one or both fields are empty.",
      details: { companyName, legalName },
      riskPoints: 0,
    };
  }

  const { score, normalizedName1, normalizedName2 } = compareCompanyNames(
    companyName,
    legalName
  );

  let status: ValidationStepStatus;
  let message: string;
  let riskPoints: number;

  if (score >= 90) {
    status = "PASSED";
    message = `Company name matches the legal entity after normalization (${score}% similarity).`;
    riskPoints = 0;
  } else if (score >= 80) {
    status = "WARNING";
    message = `Partial match between company name and legal name (${score}% similarity). Review recommended.`;
    riskPoints = 10;
  } else {
    status = "FAILED";
    message = `Significant mismatch between company name "${companyName}" and legal name "${legalName}" (${score}% similarity).`;
    riskPoints = 20;
  }

  return {
    stepName: "Company Name Match",
    status,
    message,
    details: {
      companyName,
      legalName,
      normalizedCompanyName: normalizedName1,
      normalizedLegalName: normalizedName2,
      similarityScore: score,
      status: score >= 90 ? "MATCH" : score >= 80 ? "WARNING" : "FAILED",
      reason: (score >= 90 && (companyName.toLowerCase().trim() !== normalizedName1 || legalName.toLowerCase().trim() !== normalizedName2))
        ? "Legal suffix removed before comparison."
        : undefined,
      threshold: { passed: ">=90%", warning: "80-89%", failed: "<80%" },
    },
    riskPoints,
  };
}
