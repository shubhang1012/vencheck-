import { prisma } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

// ── Zod schema for vendor creation ──
const CreateVendorSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  legalName: z.string().min(1, "Legal name is required"),
  country: z.string().min(1, "Country is required"),
  registrationNumber: z.string().min(1, "Registration number is required"),
  taxId: z.string().min(1, "Tax ID is required"),
  taxType: z.string().min(1, "Tax type is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone is required"),
  address: z.string().min(1, "Address is required"),
  bankAccountName: z.string().min(1, "Bank account name is required"),
  bankAccountNumber: z.string().min(1, "Bank account number is required"),
  ifscSwift: z.string().min(1, "IFSC/SWIFT code is required"),
  website: z.string().optional(),
  documents: z
    .array(
      z.object({
        type: z.string().min(1, "Document type is required"),
        fileName: z.string(),
        filePath: z.string(),
        mimeType: z.string(),
        extractedText: z.string().optional(),
      })
    )
    .optional(),
});

const VALID_DOC_TYPES = ["GST_CERTIFICATE", "CERTIFICATE_OF_INCORPORATION", "CANCELLED_CHEQUE", "PAN_CARD"] as const;
type ValidDocType = typeof VALID_DOC_TYPES[number];

function sanitizeDocType(type: string): ValidDocType {
  if ((VALID_DOC_TYPES as readonly string[]).includes(type)) {
    return type as ValidDocType;
  }
  return "GST_CERTIFICATE";
}

// ── GET: List vendors with optional filters ──
export async function GET(request: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    // Build where clause
    const where: Record<string, unknown> = {};

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { companyName: { contains: search } },
        { legalName: { contains: search } },
        { email: { contains: search } },
        { taxId: { contains: search } },
        { registrationNumber: { contains: search } },
      ];
    }

    const [vendors, total] = await Promise.all([
      prisma.vendor.findMany({
        where,
        include: {
          _count: {
            select: { documents: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.vendor.count({ where }),
    ]);

    return Response.json({
      vendors: vendors.map((v) => ({
        ...v,
        documentCount: v._count.documents,
        _count: undefined,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET /api/vendors error:", error);
    return Response.json(
      {
        error: "Failed to fetch vendors",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// ── POST: Create new vendor ──
export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const parsed = CreateVendorSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        {
          error: "Validation failed",
          issues: parsed.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
        { status: 400 }
      );
    }

    const { documents, ...vendorData } = parsed.data;

    // Create vendor with optional documents
    const vendor = await prisma.vendor.create({
      data: {
        ...vendorData,
        status: "PENDING",
        documents: documents
          ? {
              create: documents.map((doc) => ({
                type: sanitizeDocType(doc.type),
                fileName: doc.fileName,
                filePath: doc.filePath,
                mimeType: doc.mimeType,
                extractedText: doc.extractedText || null,
              })),
            }
          : undefined,
      },
      include: {
        documents: true,
      },
    });

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        vendorId: vendor.id,
        action: "VENDOR_CREATED",
        details: JSON.stringify({
          companyName: vendor.companyName,
          country: vendor.country,
          documentCount: vendor.documents.length,
        }),
      },
    });

    return Response.json({ vendor }, { status: 201 });
  } catch (error) {
    console.error("POST /api/vendors error:", error);
    return Response.json(
      {
        error: "Failed to create vendor",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
