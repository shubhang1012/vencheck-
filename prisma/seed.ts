import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  // Clear existing data
  await prisma.validationStep.deleteMany();
  await prisma.validationRun.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.document.deleteMany();
  await prisma.vendor.deleteMany();

  console.log("  Cleared existing data.");

  // ── Vendor 1: Approved (low risk, Indian company) ──
  const vendor1 = await prisma.vendor.create({
    data: {
      companyName: "TechStar Solutions Pvt Ltd",
      legalName: "TechStar Solutions Private Limited",
      country: "India",
      registrationNumber: "U72200MH2018PTC309876",
      taxId: "27AABCT1234F1Z5",
      taxType: "GST",
      email: "accounts@techstarsolutions.in",
      phone: "+91-22-4567-8901",
      address: "201 Tech Park, Whitefield, Bangalore, Karnataka 560066",
      bankAccountName: "TechStar Solutions Private Limited",
      bankAccountNumber: "912345678901234",
      ifscSwift: "SBIN0001234",
      website: "https://techstarsolutions.in",
      status: "APPROVED",
      riskScore: 5,
      decision: "APPROVED",
      reasoning:
        "All validations passed. Company information is consistent across documents. Low risk vendor.",
    },
  });

  await prisma.document.createMany({
    data: [
      {
        vendorId: vendor1.id,
        type: "GST_CERTIFICATE",
        fileName: "techstar-gst-cert.pdf",
        filePath: "/uploads/techstar-gst-cert.pdf",
        mimeType: "application/pdf",
        extractedText:
          "GST Registration Certificate\nGSTIN: 27AABCT1234F1Z5\nLegal Name: TechStar Solutions Private Limited\nTrade Name: TechStar Solutions Pvt Ltd\nAddress: 201 Tech Park, Whitefield, Bangalore, Karnataka 560066\nDate of Registration: 15/06/2018",
      },
      {
        vendorId: vendor1.id,
        type: "CERTIFICATE_OF_INCORPORATION",
        fileName: "techstar-coi.pdf",
        filePath: "/uploads/techstar-coi.pdf",
        mimeType: "application/pdf",
        extractedText:
          "Certificate of Incorporation\nCompany Name: TechStar Solutions Private Limited\nCIN: U72200MH2018PTC309876\nDate of Incorporation: 01/03/2018\nRegistered Office: 201 Tech Park, Whitefield, Bangalore, Karnataka 560066",
      },
      {
        vendorId: vendor1.id,
        type: "CANCELLED_CHEQUE",
        fileName: "techstar-cheque.pdf",
        filePath: "/uploads/techstar-cheque.pdf",
        mimeType: "application/pdf",
        extractedText:
          "State Bank of India\nBranch: Whitefield\nIFSC: SBIN0001234\nAccount Name: TechStar Solutions Private Limited\nAccount Number: 912345678901234",
      },
      {
        vendorId: vendor1.id,
        type: "PAN_CARD",
        fileName: "techstar-pan.pdf",
        filePath: "/uploads/techstar-pan.pdf",
        mimeType: "application/pdf",
        extractedText:
          "Income Tax Department\nPermanent Account Number\nPAN: AABCT1234F\nName: TechStar Solutions Private Limited\nFather's Name: N/A\nDate of Birth/Incorporation: 01/03/2018",
      },
    ],
  });

  const run1 = await prisma.validationRun.create({
    data: {
      vendorId: vendor1.id,
      status: "COMPLETED",
      completedAt: new Date(Date.now() - 86400000),
    },
  });

  await prisma.validationStep.createMany({
    data: [
      { runId: run1.id, stepName: "Required Fields Check", status: "PASSED", message: "All required fields are present and non-empty.", stepOrder: 1, duration: 450 },
      { runId: run1.id, stepName: "Required Documents Check", status: "PASSED", message: "All 4 required documents are uploaded.", stepOrder: 2, duration: 380 },
      { runId: run1.id, stepName: "Tax ID Validation", status: "PASSED", message: 'Tax ID "27AABCT1234F1Z5" is valid (Indian GST Number).', stepOrder: 3, duration: 520 },
      { runId: run1.id, stepName: "IFSC/SWIFT Validation", status: "PASSED", message: 'IFSC code "SBIN0001234" is valid.', stepOrder: 4, duration: 340 },
      { runId: run1.id, stepName: "Email Validation", status: "PASSED", message: 'Email "accounts@techstarsolutions.in" is valid.', stepOrder: 5, duration: 310 },
      { runId: run1.id, stepName: "Company Name Match", status: "PASSED", message: "Company name and legal name match (92% similarity).", stepOrder: 6, duration: 480 },
      { runId: run1.id, stepName: "Bank Account Consistency", status: "PASSED", message: "Bank account name matches legalName (100% similarity).", stepOrder: 7, duration: 420 },
      { runId: run1.id, stepName: "Duplicate Detection", status: "PASSED", message: "No duplicate vendors detected.", stepOrder: 8, duration: 680 },
      { runId: run1.id, stepName: "AI Document Review", status: "PASSED", message: "Document content is consistent with submitted vendor information.", stepOrder: 9, duration: 750 },
      { runId: run1.id, stepName: "Risk Score Calculation", status: "PASSED", message: "Risk score: 5/100 — LOW RISK. Vendor approved for onboarding.", stepOrder: 10, duration: 300, details: JSON.stringify({ rawScore: 5, cappedScore: 5, decision: "APPROVED" }) },
    ],
  });

  await prisma.auditLog.createMany({
    data: [
      { vendorId: vendor1.id, action: "VENDOR_CREATED", details: JSON.stringify({ companyName: "TechStar Solutions Pvt Ltd", country: "India" }) },
      { vendorId: vendor1.id, action: "VALIDATION_STARTED", details: JSON.stringify({ companyName: "TechStar Solutions Pvt Ltd" }) },
      { vendorId: vendor1.id, action: "VALIDATION_COMPLETED", details: JSON.stringify({ decision: "APPROVED", riskScore: 5 }) },
    ],
  });

  console.log("  ✅ Vendor 1 (Approved): TechStar Solutions Pvt Ltd");

  // ── Vendor 2: Approved (low risk, UK company) ──
  const vendor2 = await prisma.vendor.create({
    data: {
      companyName: "Brighton Digital Services Ltd",
      legalName: "Brighton Digital Services Limited",
      country: "United Kingdom",
      registrationNumber: "12345678",
      taxId: "GB987654321",
      taxType: "VAT",
      email: "finance@brightondigital.co.uk",
      phone: "+44-20-7946-0958",
      address: "42 King's Road, Brighton, East Sussex, BN1 2FW, United Kingdom",
      bankAccountName: "Brighton Digital Services Limited",
      bankAccountNumber: "45678901",
      ifscSwift: "BARCGB22",
      website: "https://brightondigital.co.uk",
      status: "APPROVED",
      riskScore: 0,
      decision: "APPROVED",
      reasoning:
        "All validations passed with zero risk. Clean vendor profile.",
    },
  });

  await prisma.document.createMany({
    data: [
      {
        vendorId: vendor2.id,
        type: "GST_CERTIFICATE",
        fileName: "brighton-vat-cert.pdf",
        filePath: "/uploads/brighton-vat-cert.pdf",
        mimeType: "application/pdf",
        extractedText:
          "HM Revenue & Customs\nVAT Registration Certificate\nVAT Number: GB987654321\nName: Brighton Digital Services Limited\nEffective Date: 01 April 2019\nAddress: 42 King's Road, Brighton, East Sussex, BN1 2FW",
      },
      {
        vendorId: vendor2.id,
        type: "CERTIFICATE_OF_INCORPORATION",
        fileName: "brighton-coi.pdf",
        filePath: "/uploads/brighton-coi.pdf",
        mimeType: "application/pdf",
        extractedText:
          "Companies House\nCertificate of Incorporation\nCompany Number: 12345678\nCompany Name: Brighton Digital Services Limited\nIncorporated: 15 January 2019",
      },
      {
        vendorId: vendor2.id,
        type: "CANCELLED_CHEQUE",
        fileName: "brighton-bank-stmt.pdf",
        filePath: "/uploads/brighton-bank-stmt.pdf",
        mimeType: "application/pdf",
        extractedText:
          "Barclays Bank\nBranch: Brighton\nSWIFT/BIC: BARCGB22\nAccount Name: Brighton Digital Services Limited\nAccount Number: 45678901\nSort Code: 20-44-59",
      },
      {
        vendorId: vendor2.id,
        type: "PAN_CARD",
        fileName: "brighton-tax-ref.pdf",
        filePath: "/uploads/brighton-tax-ref.pdf",
        mimeType: "application/pdf",
        extractedText:
          "HM Revenue & Customs\nTax Reference\nUTR: 1234567890\nName: Brighton Digital Services Limited\nRegistered Address: 42 King's Road, Brighton",
      },
    ],
  });

  const run2 = await prisma.validationRun.create({
    data: {
      vendorId: vendor2.id,
      status: "COMPLETED",
      completedAt: new Date(Date.now() - 172800000),
    },
  });

  await prisma.validationStep.createMany({
    data: [
      { runId: run2.id, stepName: "Required Fields Check", status: "PASSED", message: "All required fields are present and non-empty.", stepOrder: 1, duration: 400 },
      { runId: run2.id, stepName: "Required Documents Check", status: "PASSED", message: "All 4 required documents are uploaded.", stepOrder: 2, duration: 350 },
      { runId: run2.id, stepName: "Tax ID Validation", status: "PASSED", message: 'Tax ID "GB987654321" is valid (UK VAT Number).', stepOrder: 3, duration: 490 },
      { runId: run2.id, stepName: "IFSC/SWIFT Validation", status: "PASSED", message: 'SWIFT code "BARCGB22" is valid.', stepOrder: 4, duration: 330 },
      { runId: run2.id, stepName: "Email Validation", status: "PASSED", message: 'Email "finance@brightondigital.co.uk" is valid.', stepOrder: 5, duration: 320 },
      { runId: run2.id, stepName: "Company Name Match", status: "PASSED", message: "Company name and legal name match (95% similarity).", stepOrder: 6, duration: 460 },
      { runId: run2.id, stepName: "Bank Account Consistency", status: "PASSED", message: "Bank account name matches legalName (100% similarity).", stepOrder: 7, duration: 410 },
      { runId: run2.id, stepName: "Duplicate Detection", status: "PASSED", message: "No duplicate vendors detected.", stepOrder: 8, duration: 640 },
      { runId: run2.id, stepName: "AI Document Review", status: "PASSED", message: "Document content is consistent with submitted vendor information.", stepOrder: 9, duration: 720 },
      { runId: run2.id, stepName: "Risk Score Calculation", status: "PASSED", message: "Risk score: 0/100 — LOW RISK. Vendor approved for onboarding.", stepOrder: 10, duration: 310, details: JSON.stringify({ rawScore: 0, cappedScore: 0, decision: "APPROVED" }) },
    ],
  });

  await prisma.auditLog.createMany({
    data: [
      { vendorId: vendor2.id, action: "VENDOR_CREATED", details: JSON.stringify({ companyName: "Brighton Digital Services Ltd", country: "United Kingdom" }) },
      { vendorId: vendor2.id, action: "VALIDATION_COMPLETED", details: JSON.stringify({ decision: "APPROVED", riskScore: 0 }) },
    ],
  });

  console.log("  ✅ Vendor 2 (Approved): Brighton Digital Services Ltd");

  // ── Vendor 3: Pending (medium risk, missing docs) ──
  const vendor3 = await prisma.vendor.create({
    data: {
      companyName: "GreenLeaf Exports",
      legalName: "GreenLeaf Exports India Pvt Ltd",
      country: "India",
      registrationNumber: "U51100KA2020PTC134567",
      taxId: "29AADCG5678K1Z3",
      taxType: "GST",
      email: "info@greenleafexports.com",
      phone: "+91-80-4123-4567",
      address: "45 Industrial Area, Phase 2, Peenya, Bangalore 560058",
      bankAccountName: "Greenleaf Exports India",
      bankAccountNumber: "50100123456789",
      ifscSwift: "HDFC0001234",
      website: "https://greenleafexports.com",
      status: "PENDING",
      riskScore: 40,
      decision: "PENDING",
      reasoning:
        "Medium risk: 2 missing documents (Cancelled Cheque, PAN Card). Bank account name partially matches. Manual review required.",
    },
  });

  await prisma.document.createMany({
    data: [
      {
        vendorId: vendor3.id,
        type: "GST_CERTIFICATE",
        fileName: "greenleaf-gst.pdf",
        filePath: "/uploads/greenleaf-gst.pdf",
        mimeType: "application/pdf",
        extractedText:
          "GST Registration Certificate\nGSTIN: 29AADCG5678K1Z3\nLegal Name: GreenLeaf Exports India Pvt Ltd\nAddress: 45 Industrial Area, Phase 2, Peenya, Bangalore 560058",
      },
      {
        vendorId: vendor3.id,
        type: "CERTIFICATE_OF_INCORPORATION",
        fileName: "greenleaf-coi.pdf",
        filePath: "/uploads/greenleaf-coi.pdf",
        mimeType: "application/pdf",
        extractedText:
          "Ministry of Corporate Affairs\nCertificate of Incorporation\nCIN: U51100KA2020PTC134567\nCompany Name: GreenLeaf Exports India Pvt Ltd\nDate of Incorporation: 10/06/2020",
      },
    ],
  });

  const run3 = await prisma.validationRun.create({
    data: {
      vendorId: vendor3.id,
      status: "COMPLETED",
      completedAt: new Date(Date.now() - 43200000),
    },
  });

  await prisma.validationStep.createMany({
    data: [
      { runId: run3.id, stepName: "Required Fields Check", status: "PASSED", message: "All required fields are present.", stepOrder: 1, duration: 410 },
      { runId: run3.id, stepName: "Required Documents Check", status: "FAILED", message: "2 required document(s) missing: Cancelled Cheque, PAN Card", stepOrder: 2, duration: 380, details: JSON.stringify({ missingDocuments: ["Cancelled Cheque", "PAN Card"] }) },
      { runId: run3.id, stepName: "Tax ID Validation", status: "PASSED", message: "Tax ID is valid (Indian GST Number).", stepOrder: 3, duration: 510 },
      { runId: run3.id, stepName: "IFSC/SWIFT Validation", status: "PASSED", message: "IFSC code is valid.", stepOrder: 4, duration: 350 },
      { runId: run3.id, stepName: "Email Validation", status: "PASSED", message: "Email is valid.", stepOrder: 5, duration: 300 },
      { runId: run3.id, stepName: "Company Name Match", status: "WARNING", message: "Partial match (72% similarity).", stepOrder: 6, duration: 470, details: JSON.stringify({ similarityScore: 72 }) },
      { runId: run3.id, stepName: "Bank Account Consistency", status: "WARNING", message: "Bank name partially matches (65% similarity).", stepOrder: 7, duration: 440 },
      { runId: run3.id, stepName: "Duplicate Detection", status: "PASSED", message: "No duplicates found.", stepOrder: 8, duration: 660 },
      { runId: run3.id, stepName: "AI Document Review", status: "WARNING", message: "Partial match. Some info consistent but gaps due to missing documents.", stepOrder: 9, duration: 700 },
      { runId: run3.id, stepName: "Risk Score Calculation", status: "WARNING", message: "Risk score: 40/100 — MEDIUM RISK.", stepOrder: 10, duration: 320, details: JSON.stringify({ rawScore: 40, cappedScore: 40, decision: "PENDING" }) },
    ],
  });

  await prisma.auditLog.createMany({
    data: [
      { vendorId: vendor3.id, action: "VENDOR_CREATED", details: JSON.stringify({ companyName: "GreenLeaf Exports" }) },
      { vendorId: vendor3.id, action: "VALIDATION_COMPLETED", details: JSON.stringify({ decision: "PENDING", riskScore: 40 }) },
    ],
  });

  console.log("  ⏳ Vendor 3 (Pending): GreenLeaf Exports");

  // ── Vendor 4: Pending (medium risk, name mismatch) ──
  const vendor4 = await prisma.vendor.create({
    data: {
      companyName: "Swift Logistics Co",
      legalName: "Swift Logistics and Transport Corporation",
      country: "United States",
      registrationNumber: "DE-2021-0045678",
      taxId: "84-7654321",
      taxType: "EIN",
      email: "ap@swiftlogistics.us",
      phone: "+1-302-555-0142",
      address: "1209 Orange Street, Wilmington, Delaware 19801, USA",
      bankAccountName: "Swift Logistics Corp",
      bankAccountNumber: "7890123456",
      ifscSwift: "CHASUS33",
      website: "https://swiftlogistics.us",
      status: "PENDING",
      riskScore: 35,
      decision: "PENDING",
      reasoning:
        "Medium risk: Company name partially matches legal name (68%). Bank account name partially matches. Missing PAN Card document.",
    },
  });

  await prisma.document.createMany({
    data: [
      {
        vendorId: vendor4.id,
        type: "GST_CERTIFICATE",
        fileName: "swift-tax-cert.pdf",
        filePath: "/uploads/swift-tax-cert.pdf",
        mimeType: "application/pdf",
        extractedText:
          "IRS\nEmployer Identification Number Confirmation\nEIN: 84-7654321\nName: Swift Logistics and Transport Corporation\nAddress: 1209 Orange Street, Wilmington, DE 19801",
      },
      {
        vendorId: vendor4.id,
        type: "CERTIFICATE_OF_INCORPORATION",
        fileName: "swift-coi.pdf",
        filePath: "/uploads/swift-coi.pdf",
        mimeType: "application/pdf",
        extractedText:
          "State of Delaware\nCertificate of Incorporation\nFile Number: DE-2021-0045678\nName: Swift Logistics and Transport Corporation\nDate Filed: March 15, 2021",
      },
      {
        vendorId: vendor4.id,
        type: "CANCELLED_CHEQUE",
        fileName: "swift-void-check.pdf",
        filePath: "/uploads/swift-void-check.pdf",
        mimeType: "application/pdf",
        extractedText:
          "JPMorgan Chase\nSwift Logistics Corp\nAccount: 7890123456\nRouting: 021000021\nSWIFT: CHASUS33",
      },
    ],
  });

  const run4 = await prisma.validationRun.create({
    data: {
      vendorId: vendor4.id,
      status: "COMPLETED",
      completedAt: new Date(Date.now() - 21600000),
    },
  });

  await prisma.validationStep.createMany({
    data: [
      { runId: run4.id, stepName: "Required Fields Check", status: "PASSED", message: "All required fields are present.", stepOrder: 1, duration: 420 },
      { runId: run4.id, stepName: "Required Documents Check", status: "WARNING", message: "1 required document missing: PAN Card", stepOrder: 2, duration: 360 },
      { runId: run4.id, stepName: "Tax ID Validation", status: "PASSED", message: "Tax ID is valid (US EIN).", stepOrder: 3, duration: 500 },
      { runId: run4.id, stepName: "IFSC/SWIFT Validation", status: "PASSED", message: "SWIFT code is valid.", stepOrder: 4, duration: 340 },
      { runId: run4.id, stepName: "Email Validation", status: "PASSED", message: "Email is valid.", stepOrder: 5, duration: 310 },
      { runId: run4.id, stepName: "Company Name Match", status: "WARNING", message: "Partial match (68% similarity).", stepOrder: 6, duration: 490 },
      { runId: run4.id, stepName: "Bank Account Consistency", status: "WARNING", message: "Bank name partially matches (62% similarity).", stepOrder: 7, duration: 430 },
      { runId: run4.id, stepName: "Duplicate Detection", status: "PASSED", message: "No duplicates found.", stepOrder: 8, duration: 670 },
      { runId: run4.id, stepName: "AI Document Review", status: "PASSED", message: "Documents consistent with vendor information.", stepOrder: 9, duration: 710 },
      { runId: run4.id, stepName: "Risk Score Calculation", status: "WARNING", message: "Risk score: 35/100 — MEDIUM RISK.", stepOrder: 10, duration: 300, details: JSON.stringify({ rawScore: 35, cappedScore: 35, decision: "PENDING" }) },
    ],
  });

  await prisma.auditLog.createMany({
    data: [
      { vendorId: vendor4.id, action: "VENDOR_CREATED", details: JSON.stringify({ companyName: "Swift Logistics Co" }) },
      { vendorId: vendor4.id, action: "VALIDATION_COMPLETED", details: JSON.stringify({ decision: "PENDING", riskScore: 35 }) },
    ],
  });

  console.log("  ⏳ Vendor 4 (Pending): Swift Logistics Co");

  // ── Vendor 5: Rejected (high risk, country-tax mismatch) ──
  const vendor5 = await prisma.vendor.create({
    data: {
      companyName: "Omega Trading LLC",
      legalName: "Alpha Omega International Corp",
      country: "India",
      registrationNumber: "L45200MH2019PLC987654",
      taxId: "87-1234567",
      taxType: "EIN",
      email: "info@mailinator.com",
      phone: "+91-22-6789-0123",
      address: "Tower B, 5th Floor, Nariman Point, Mumbai 400021",
      bankAccountName: "Omega International Trading",
      bankAccountNumber: "1234567890",
      ifscSwift: "SBININBB",
      website: "",
      status: "REJECTED",
      riskScore: 85,
      decision: "REJECTED",
      reasoning:
        "High risk: Country-Tax ID mismatch (India with US EIN format). Significant company name mismatch. Bank name inconsistency. Disposable email domain. Multiple red flags.",
    },
  });

  await prisma.document.createMany({
    data: [
      {
        vendorId: vendor5.id,
        type: "GST_CERTIFICATE",
        fileName: "omega-gst.pdf",
        filePath: "/uploads/omega-gst.pdf",
        mimeType: "application/pdf",
        extractedText:
          "GST Registration Certificate\nGSTIN: 27AALCA5678K2Z1\nLegal Name: Alpha Omega International Corp\nAddress: Tower B, Nariman Point, Mumbai",
      },
      {
        vendorId: vendor5.id,
        type: "CERTIFICATE_OF_INCORPORATION",
        fileName: "omega-coi.pdf",
        filePath: "/uploads/omega-coi.pdf",
        mimeType: "application/pdf",
        extractedText:
          "Certificate of Incorporation\nCompany: Alpha Omega International Corp\nCIN: L45200MH2019PLC987654",
      },
    ],
  });

  const run5 = await prisma.validationRun.create({
    data: {
      vendorId: vendor5.id,
      status: "COMPLETED",
      completedAt: new Date(Date.now() - 259200000),
    },
  });

  await prisma.validationStep.createMany({
    data: [
      { runId: run5.id, stepName: "Required Fields Check", status: "PASSED", message: "All required fields present.", stepOrder: 1, duration: 430 },
      { runId: run5.id, stepName: "Required Documents Check", status: "FAILED", message: "2 required documents missing: Cancelled Cheque, PAN Card", stepOrder: 2, duration: 370, details: JSON.stringify({ missingDocuments: ["Cancelled Cheque", "PAN Card"] }) },
      { runId: run5.id, stepName: "Tax ID Validation", status: "FAILED", message: "Country-Tax ID mismatch: India with US EIN format.", stepOrder: 3, duration: 530, details: JSON.stringify({ countryMismatch: true, country: "India", detectedFormat: "US_EIN" }) },
      { runId: run5.id, stepName: "IFSC/SWIFT Validation", status: "PASSED", message: "SWIFT code is valid.", stepOrder: 4, duration: 350 },
      { runId: run5.id, stepName: "Email Validation", status: "WARNING", message: "Email uses disposable domain (mailinator.com).", stepOrder: 5, duration: 320 },
      { runId: run5.id, stepName: "Company Name Match", status: "FAILED", message: "Significant mismatch (38% similarity).", stepOrder: 6, duration: 500, details: JSON.stringify({ similarityScore: 38 }) },
      { runId: run5.id, stepName: "Bank Account Consistency", status: "FAILED", message: "Bank name does not match company or legal name (42% similarity).", stepOrder: 7, duration: 450 },
      { runId: run5.id, stepName: "Duplicate Detection", status: "PASSED", message: "No duplicates found.", stepOrder: 8, duration: 690 },
      { runId: run5.id, stepName: "AI Document Review", status: "FAILED", message: "Significant inconsistencies between documents and vendor info.", stepOrder: 9, duration: 740 },
      { runId: run5.id, stepName: "Risk Score Calculation", status: "FAILED", message: "Risk score: 85/100 — HIGH RISK. Rejected.", stepOrder: 10, duration: 310, details: JSON.stringify({ rawScore: 85, cappedScore: 85, decision: "REJECTED" }) },
    ],
  });

  await prisma.auditLog.createMany({
    data: [
      { vendorId: vendor5.id, action: "VENDOR_CREATED", details: JSON.stringify({ companyName: "Omega Trading LLC" }) },
      { vendorId: vendor5.id, action: "VALIDATION_COMPLETED", details: JSON.stringify({ decision: "REJECTED", riskScore: 85 }) },
    ],
  });

  console.log("  ❌ Vendor 5 (Rejected): Omega Trading LLC");

  // ── Vendor 6: Rejected (high risk, duplicate + invalid IFSC) ──
  const vendor6 = await prisma.vendor.create({
    data: {
      companyName: "TechStar Solutions",
      legalName: "TechStar Solutions & Services",
      country: "India",
      registrationNumber: "U72200MH2022PTC445566",
      taxId: "27AABCT1234F1Z5",
      taxType: "GST",
      email: "contact@techstar-services.in",
      phone: "+91-22-9876-5432",
      address: "301 Business Hub, Andheri East, Mumbai 400069",
      bankAccountName: "TechStar Services",
      bankAccountNumber: "6789012345",
      ifscSwift: "ABCD1234567",
      status: "REJECTED",
      riskScore: 75,
      decision: "REJECTED",
      reasoning:
        "High risk: Duplicate vendor detected (same Tax ID as TechStar Solutions Pvt Ltd). Invalid IFSC code format. Bank name inconsistency.",
    },
  });

  await prisma.document.createMany({
    data: [
      {
        vendorId: vendor6.id,
        type: "GST_CERTIFICATE",
        fileName: "techstar2-gst.pdf",
        filePath: "/uploads/techstar2-gst.pdf",
        mimeType: "application/pdf",
        extractedText:
          "GST Certificate\nGSTIN: 27AABCT1234F1Z5\nName: TechStar Solutions & Services",
      },
      {
        vendorId: vendor6.id,
        type: "CERTIFICATE_OF_INCORPORATION",
        fileName: "techstar2-coi.pdf",
        filePath: "/uploads/techstar2-coi.pdf",
        mimeType: "application/pdf",
        extractedText:
          "Certificate of Incorporation\nCIN: U72200MH2022PTC445566\nCompany: TechStar Solutions & Services",
      },
      {
        vendorId: vendor6.id,
        type: "CANCELLED_CHEQUE",
        fileName: "techstar2-cheque.png",
        filePath: "/uploads/techstar2-cheque.png",
        mimeType: "image/png",
        extractedText:
          "[Image document — OCR text extraction not available. Manual review required.]",
      },
      {
        vendorId: vendor6.id,
        type: "PAN_CARD",
        fileName: "techstar2-pan.pdf",
        filePath: "/uploads/techstar2-pan.pdf",
        mimeType: "application/pdf",
        extractedText:
          "Income Tax Department\nPAN: AABCT1234F\nName: TechStar Solutions & Services",
      },
    ],
  });

  const run6 = await prisma.validationRun.create({
    data: {
      vendorId: vendor6.id,
      status: "COMPLETED",
      completedAt: new Date(Date.now() - 3600000),
    },
  });

  await prisma.validationStep.createMany({
    data: [
      { runId: run6.id, stepName: "Required Fields Check", status: "PASSED", message: "All required fields present.", stepOrder: 1, duration: 440 },
      { runId: run6.id, stepName: "Required Documents Check", status: "PASSED", message: "All 4 required documents uploaded.", stepOrder: 2, duration: 390 },
      { runId: run6.id, stepName: "Tax ID Validation", status: "PASSED", message: "Tax ID is valid (Indian GST Number).", stepOrder: 3, duration: 510 },
      { runId: run6.id, stepName: "IFSC/SWIFT Validation", status: "FAILED", message: '"ABCD1234567" does not match IFSC or SWIFT format.', stepOrder: 4, duration: 360, details: JSON.stringify({ code: "ABCD1234567", valid: false }) },
      { runId: run6.id, stepName: "Email Validation", status: "PASSED", message: "Email is valid.", stepOrder: 5, duration: 330 },
      { runId: run6.id, stepName: "Company Name Match", status: "WARNING", message: "Partial match (75% similarity).", stepOrder: 6, duration: 480, details: JSON.stringify({ similarityScore: 75 }) },
      { runId: run6.id, stepName: "Bank Account Consistency", status: "FAILED", message: "Bank name does not match company or legal name (55% similarity).", stepOrder: 7, duration: 440 },
      { runId: run6.id, stepName: "Duplicate Detection", status: "FAILED", message: "Potential duplicate found: same Tax ID as existing vendor.", stepOrder: 8, duration: 700, details: JSON.stringify({ duplicatesFound: 1, matchField: "taxId" }) },
      { runId: run6.id, stepName: "AI Document Review", status: "WARNING", message: "Partial match. Some document inconsistencies detected.", stepOrder: 9, duration: 730 },
      { runId: run6.id, stepName: "Risk Score Calculation", status: "FAILED", message: "Risk score: 75/100 — HIGH RISK. Rejected.", stepOrder: 10, duration: 305, details: JSON.stringify({ rawScore: 75, cappedScore: 75, decision: "REJECTED" }) },
    ],
  });

  await prisma.auditLog.createMany({
    data: [
      { vendorId: vendor6.id, action: "VENDOR_CREATED", details: JSON.stringify({ companyName: "TechStar Solutions" }) },
      { vendorId: vendor6.id, action: "VALIDATION_COMPLETED", details: JSON.stringify({ decision: "REJECTED", riskScore: 75 }) },
    ],
  });

  console.log("  ❌ Vendor 6 (Rejected): TechStar Solutions (duplicate)");

  console.log("");
  console.log("🌱 Seed completed! Created 6 vendors with documents, validation runs, and audit logs.");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
