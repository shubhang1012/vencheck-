"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Building2,
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  BarChart3,
  Search,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatDate, getRiskColor } from "@/lib/utils";

interface DashboardStats {
  totalVendors: number;
  approved: number;
  pending: number;
  rejected: number;
  avgRiskScore: number;
}

interface VendorRow {
  id: string;
  companyName: string;
  country: string;
  status: string;
  riskScore: number | null;
  createdAt: string;
}

type SortField = "companyName" | "country" | "status" | "riskScore" | "createdAt";
type SortDir = "asc" | "desc";

const statusFilters = ["All", "Approved", "Pending", "Rejected"];

function AnimatedCounter({ value, duration = 800 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + (end - start) * eased));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  return <>{display}</>;
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, vendorsRes] = await Promise.all([
          fetch("/api/dashboard/stats"),
          fetch("/api/vendors"),
        ]);

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          const s = statsData.stats || statsData;
          setStats({
            totalVendors: s.totalVendors ?? 0,
            approved: s.approvedCount ?? s.approved ?? 0,
            pending: (s.pendingCount ?? s.pending ?? 0) + (s.processingCount ?? 0),
            rejected: s.rejectedCount ?? s.rejected ?? 0,
            avgRiskScore: s.averageRiskScore ?? s.avgRiskScore ?? 0,
          });
        }

        if (vendorsRes.ok) {
          const vendorsData = await vendorsRes.json();
          setVendors(Array.isArray(vendorsData) ? vendorsData : vendorsData.vendors || []);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const filteredVendors = useMemo(() => {
    let result = [...vendors];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (v) =>
          v.companyName.toLowerCase().includes(q) ||
          v.country.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== "All") {
      const filterMap: Record<string, string[]> = {
        Approved: ["approved", "APPROVED"],
        Pending: ["pending_review", "pending", "processing", "PENDING", "PENDING_REVIEW", "PROCESSING"],
        Rejected: ["rejected", "REJECTED"],
      };
      const statuses = filterMap[statusFilter] || [];
      result = result.filter((v) => statuses.includes(v.status));
    }

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "companyName":
          comparison = a.companyName.localeCompare(b.companyName);
          break;
        case "country":
          comparison = a.country.localeCompare(b.country);
          break;
        case "status":
          comparison = a.status.localeCompare(b.status);
          break;
        case "riskScore":
          comparison = (a.riskScore ?? 0) - (b.riskScore ?? 0);
          break;
        case "createdAt":
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }
      return sortDir === "asc" ? comparison : -comparison;
    });

    return result;
  }, [vendors, searchQuery, statusFilter, sortField, sortDir]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDir === "asc" ? (
      <ChevronUp className="h-3 w-3 text-muted-foreground" />
    ) : (
      <ChevronDown className="h-3 w-3 text-muted-foreground" />
    );
  };

  const statCards = [
    {
      key: "totalVendors" as const,
      label: "Total Vendors",
      icon: Users,
      color: "text-indigo-500",
      bg: "bg-indigo-500/10",
    },
    {
      key: "approved" as const,
      label: "Approved",
      icon: CheckCircle2,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      key: "pending" as const,
      label: "Pending",
      icon: Clock,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      key: "rejected" as const,
      label: "Rejected",
      icon: XCircle,
      color: "text-red-500",
      bg: "bg-red-500/10",
    },
    {
      key: "avgRiskScore" as const,
      label: "Avg Risk",
      icon: BarChart3,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
  ];

  return (
    <div className="min-h-screen py-16 px-4 bg-gradient-to-br from-background to-muted/20">
      <div className="mx-auto max-w-5xl space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-card-foreground">
              Procurement Center
            </h1>
            <p className="text-muted-foreground text-xs font-medium">
              Manage external partner registrations, validation reviews, and audit trails.
            </p>
          </div>
          <Button asChild size="sm" className="font-semibold shadow-sm hover:shadow transition-all">
            <Link href="/onboarding">
              <Building2 className="h-4 w-4 shrink-0 mr-1.5" />
              Register Vendor
            </Link>
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {statCards.map((card, i) => (
            <motion.div
              key={card.key}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.04 }}
              className="group rounded-xl border border-border/70 bg-card p-4 flex flex-col justify-between h-24 hover:border-primary/20 hover:shadow-sm transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  {card.label}
                </span>
                <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center transition-colors group-hover:scale-105 duration-200", card.bg)}>
                  <card.icon className={cn("h-4 w-4", card.color)} />
                </div>
              </div>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-2xl font-extrabold text-card-foreground leading-none tracking-tight">
                  {loading ? (
                    <Skeleton className="h-7 w-12" />
                  ) : (
                    <AnimatedCounter value={stats ? stats[card.key] : 0} />
                  )}
                </span>
                {card.key === "avgRiskScore" && !loading && (
                  <span className="text-xs text-muted-foreground">/100</span>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Vendor Table */}
        <Card className="border shadow-none">
          <CardHeader className="pb-3 border-b">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle className="text-sm font-bold uppercase tracking-wider">Vendor Directory</CardTitle>
                <CardDescription className="text-xs">
                  {filteredVendors.length} profile{filteredVendors.length !== 1 ? "s" : ""} active in system.
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {/* Status Filter Pills */}
                <div className="flex bg-muted/40 rounded-lg p-0.5 border">
                  {statusFilters.map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setStatusFilter(filter)}
                      className={cn(
                        "rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer",
                        statusFilter === filter
                          ? "bg-background text-primary shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {filter}
                    </button>
                  ))}
                </div>

                <div className="relative w-full sm:w-56">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 text-xs h-8"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-4 space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <Skeleton className="h-8 w-44" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                ))}
              </div>
            ) : filteredVendors.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Building2 className="h-10 w-10 text-muted-foreground/20 mb-3" />
                <p className="text-xs font-semibold text-muted-foreground">No vendors match filter criteria</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/10 text-muted-foreground font-semibold uppercase text-[10px]">
                      {(
                        [
                          { field: "companyName" as SortField, label: "Name" },
                          { field: "country" as SortField, label: "Country" },
                          { field: "status" as SortField, label: "Compliance Status" },
                          { field: "riskScore" as SortField, label: "Risk" },
                          { field: "createdAt" as SortField, label: "Registered Date" },
                        ] as const
                      ).map((col) => (
                        <th
                          key={col.field}
                          onClick={() => handleSort(col.field)}
                          className="px-4 py-3 cursor-pointer hover:bg-muted/15 transition-colors select-none"
                        >
                          <span className="flex items-center gap-1">
                            {col.label}
                            <SortIcon field={col.field} />
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {filteredVendors.map((vendor) => {
                      const getMinimalStatusIcon = (status: string) => {
                        const s = status.toLowerCase();
                        if (s === "approved") {
                          return (
                            <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-500 ring-1 ring-inset ring-emerald-500/20 uppercase tracking-wide">
                              Approved
                            </span>
                          );
                        }
                        if (s === "rejected") {
                          return (
                            <span className="inline-flex items-center rounded-full bg-rose-500/10 px-2.5 py-0.5 text-[10px] font-bold text-rose-500 ring-1 ring-inset ring-rose-500/20 uppercase tracking-wide">
                              Rejected
                            </span>
                          );
                        }
                        return (
                          <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold text-amber-500 ring-1 ring-inset ring-amber-500/20 uppercase tracking-wide">
                            Pending
                          </span>
                        );
                      };

                      return (
                        <tr
                          key={vendor.id}
                          onClick={() => router.push(`/dashboard/vendors/${vendor.id}`)}
                          className="hover:bg-muted/10 transition-colors cursor-pointer"
                        >
                          <td className="px-4 py-3.5 font-semibold text-card-foreground">
                            {vendor.companyName}
                          </td>
                          <td className="px-4 py-3.5 text-muted-foreground font-medium">
                            {vendor.country}
                          </td>
                          <td className="px-4 py-3.5">
                            {getMinimalStatusIcon(vendor.status)}
                          </td>
                          <td className="px-4 py-3.5 font-semibold font-mono">
                            {vendor.riskScore != null ? (
                              <span className={getRiskColor(vendor.riskScore)}>
                                {vendor.riskScore}/100
                              </span>
                            ) : (
                              <span className="text-muted-foreground/60">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-muted-foreground font-mono text-[11px]">
                            {formatDate(vendor.createdAt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
