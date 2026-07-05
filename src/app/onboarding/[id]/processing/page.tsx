"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Clock,
  ChevronDown,
  ChevronRight,
  BarChart3,
  Plus,
  Shield,
  FileSearch,
  Brain,
  Globe,
  Landmark,
  FileCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn, formatDuration } from "@/lib/utils";
import {
  useProcessingStream,
  type ProcessingStep,
} from "@/hooks/use-processing-stream";

const stepIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  "Document Extraction": FileSearch,
  "Data Validation": FileCheck,
  "Compliance Check": Shield,
  "Sanctions Screening": Globe,
  "Bank Verification": Landmark,
  "Risk Assessment": Brain,
};

function getStepIcon(name: string) {
  return stepIcons[name] || FileCheck;
}

function StatusIcon({ status }: { status: ProcessingStep["status"] }) {
  switch (status) {
    case "running":
      return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
    case "passed":
      return <span className="text-[10px] text-emerald-500 font-bold uppercase">Passed</span>;
    case "failed":
      return <span className="text-[10px] text-red-500 font-bold uppercase">Failed</span>;
    case "warning":
      return <span className="text-[10px] text-amber-500 font-bold uppercase">Warning</span>;
    default:
      return <span className="text-[10px] text-muted-foreground/40 font-bold uppercase">Pending</span>;
  }
}

function StepRow({ step, index }: { step: ProcessingStep; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = getStepIcon(step.name);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.2 }}
    >
      <div
        className={cn(
          "rounded-lg border bg-card p-3.5 transition-colors cursor-pointer hover:bg-muted/5",
          step.status === "running" && "border-primary/30 bg-primary/5"
        )}
        onClick={() => step.details && setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3.5">
          {/* Step Icon */}
          <div className="shrink-0 h-7 w-7 rounded-md bg-muted/50 flex items-center justify-center border">
            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          </div>

          {/* Name & Msg */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className={cn(
                "text-xs font-semibold",
                step.status === "pending" ? "text-muted-foreground/60" : "text-card-foreground"
              )}>
                {step.name}
              </span>
              {step.status === "running" && (
                <span className="text-[9px] font-bold text-primary animate-pulse uppercase tracking-wider">Running</span>
              )}
            </div>
            {step.message && (
              <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                {step.message}
              </p>
            )}
          </div>

          {/* Timestamp / Duration */}
          <div className="shrink-0 text-right hidden sm:block font-mono text-[10px]">
            {step.duration != null && (
              <span className="text-muted-foreground font-semibold">
                {formatDuration(step.duration)}
              </span>
            )}
            {step.timestamp && (
              <p className="text-[9px] text-muted-foreground/50 mt-0.5">
                {new Date(step.timestamp).toLocaleTimeString()}
              </p>
            )}
          </div>

          {/* Status badge */}
          <div className="shrink-0 min-w-[50px] text-right">
            <StatusIcon status={step.status} />
          </div>

          {/* Expand Chevron */}
          {step.details && (
            <div className="shrink-0 text-muted-foreground">
              {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </div>
          )}
        </div>

        {/* Expanded details log */}
        <AnimatePresence>
          {expanded && step.details && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <Separator className="my-2.5" />
              <div className="rounded border bg-muted/20 p-2.5 text-[10px] text-muted-foreground font-mono whitespace-pre-wrap leading-relaxed">
                {step.details}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function RiskGauge({ score }: { score: number }) {
  const getColor = () => {
    if (score <= 30) return "text-emerald-500";
    if (score <= 60) return "text-amber-500";
    return "text-red-500";
  };

  const getLabel = () => {
    if (score <= 30) return "Low Risk";
    if (score <= 60) return "Medium Risk";
    return "High Risk";
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-2xl font-bold font-mono">
        <span className={getColor()}>{score}</span>
        <span className="text-muted-foreground text-xs font-normal"> /100</span>
      </div>
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        Risk Assessment: <span className={cn("font-extrabold", getColor())}>{getLabel()}</span>
      </span>
    </div>
  );
}

export default function ProcessingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { steps, isComplete, error, result, startProcessing } =
    useProcessingStream(id);

  useEffect(() => {
    startProcessing();
  }, [startProcessing]);

  const totalSteps = steps.length || 7;
  const completedSteps = steps.filter(
    (s) => s.status === "passed" || s.status === "failed" || s.status === "warning"
  ).length;
  const progressPercent = isComplete
    ? 100
    : Math.round((completedSteps / totalSteps) * 100);

  const getDecisionBadge = () => {
    if (!result) return null;
    const dec = result.decision.toLowerCase();
    if (dec === "approved") {
      return <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-600 bg-emerald-500/5 font-semibold">Approved</Badge>;
    }
    if (dec === "rejected") {
      return <Badge variant="outline" className="text-xs border-red-500/30 text-red-600 bg-red-500/5 font-semibold">Rejected</Badge>;
    }
    return <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-600 bg-amber-500/5 font-semibold">Pending Review</Badge>;
  };

  return (
    <div className="min-h-screen py-16 px-4 bg-muted/10">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-lg font-bold tracking-tight text-card-foreground flex items-center gap-2">
              Verification Engine
              {!isComplete && <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />}
            </h1>
            <p className="text-muted-foreground font-mono text-[10px]">
              ID: {id}
            </p>
          </div>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            {completedSteps}/{totalSteps} checks run
          </span>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <Progress
            value={progressPercent}
            className="h-1.5 shadow-none border bg-muted"
            indicatorClassName={cn(
              isComplete
                ? result?.decision.toLowerCase() === "approved"
                  ? "bg-emerald-500"
                  : result?.decision.toLowerCase() === "rejected"
                    ? "bg-red-500"
                    : "bg-amber-500"
                : "bg-primary"
            )}
          />
        </div>

        {/* Error State */}
        {error && (
          <Card className="border-red-500/30 bg-red-500/5">
            <CardContent className="flex items-center gap-3 py-3 text-xs">
              <XCircle className="h-4 w-4 text-red-500 shrink-0" />
              <div className="text-muted-foreground font-medium">{error}</div>
            </CardContent>
          </Card>
        )}

        {/* Steps timeline list */}
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {steps.map((step, i) => (
              <StepRow key={step.name} step={step} index={i} />
            ))}
          </AnimatePresence>

          {!isComplete && steps.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Loader2 className="h-8 w-8 text-primary animate-spin mb-3" />
              <p className="text-xs text-muted-foreground">Initializing stream connection...</p>
            </div>
          )}
        </div>

        {/* Result Card */}
        <AnimatePresence>
          {isComplete && result && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border shadow-none overflow-hidden">
                <CardHeader className="pb-3 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-bold uppercase tracking-wider">Evaluation Report</CardTitle>
                      <CardDescription className="text-xs">Compliance risk profile summary and decision recommendations.</CardDescription>
                    </div>
                    {getDecisionBadge()}
                  </div>
                </CardHeader>
                <CardContent className="pt-5 space-y-5 text-xs">
                  {/* Gauge */}
                  <div className="flex justify-center p-3 border rounded-lg bg-muted/10">
                    <RiskGauge score={result.riskScore} />
                  </div>

                  {/* Issues */}
                  {result.issues.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Verification Warning Details</h3>
                      <div className="grid gap-2">
                        {result.issues.map((issue, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-2.5 rounded-lg border bg-amber-500/5 p-3 text-muted-foreground leading-relaxed"
                          >
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                            <span>{issue}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI Reasoning */}
                  <div className="space-y-2">
                    <h3 className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Review Summary</h3>
                    <div className="rounded-lg border bg-muted/25 p-3.5 text-muted-foreground leading-relaxed font-medium">
                      {result.reasoning}
                    </div>
                  </div>

                  <Separator />

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <Button asChild size="sm" className="flex-1 font-semibold">
                      <Link href="/dashboard">
                        <BarChart3 className="h-4 w-4 shrink-0 mr-1.5" />
                        Go to Dashboard
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm" className="flex-1 font-semibold">
                      <Link href="/onboarding">
                        <Plus className="h-4 w-4 shrink-0 mr-1.5" />
                        Onboard Another
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
