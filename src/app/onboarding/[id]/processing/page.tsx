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

function ConfettiEffect() {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; color: string; size: number; delay: number }>>([]);
  
  useEffect(() => {
    const colors = ["#6366f1", "#3b82f6", "#14b8a6", "#10b981", "#f59e0b", "#ec4899"];
    const newParticles = Array.from({ length: 45 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: -10 - Math.random() * 20,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 7 + 4,
      delay: Math.random() * 0.5,
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
          }}
          animate={{
            y: ["0vh", "100vh"],
            x: [`${p.x}%`, `${p.x + (Math.random() * 30 - 15)}%`],
            rotate: [0, Math.random() * 360],
          }}
          transition={{
            duration: Math.random() * 2.5 + 2,
            ease: "easeOut",
            delay: p.delay,
          }}
        />
      ))}
    </div>
  );
}

function StatusIcon({ status }: { status: ProcessingStep["status"] }) {
  switch (status) {
    case "running":
      return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
    case "passed":
      return <span className="text-[10px] text-emerald-500 font-extrabold uppercase bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Passed</span>;
    case "failed":
      return <span className="text-[10px] text-red-500 font-extrabold uppercase bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">Failed</span>;
    case "warning":
      return <span className="text-[10px] text-amber-500 font-extrabold uppercase bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">Warning</span>;
    default:
      return <span className="text-[10px] text-muted-foreground/40 font-bold uppercase">Pending</span>;
  }
}

function StepRow({ step, index }: { step: ProcessingStep; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = getStepIcon(step.name);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.08, duration: 0.3, type: "spring", stiffness: 100 }}
    >
      <div
        className={cn(
          "rounded-lg border bg-card p-4 transition-all duration-300 cursor-pointer relative overflow-hidden",
          step.status === "running" && "border-primary/40 bg-primary/5 shadow-md shadow-primary/5 ring-1 ring-primary/20",
          step.status === "passed" && "hover:border-emerald-500/30",
          step.status === "failed" && "hover:border-red-500/30"
        )}
        onClick={() => step.details && setExpanded(!expanded)}
      >
        {/* Laser scanner animation overlay */}
        {step.status === "running" && <div className="laser-line" />}

        <div className="flex items-center gap-3.5 relative z-10">
          {/* Step Icon */}
          <div className={cn(
            "shrink-0 h-8 w-8 rounded-lg flex items-center justify-center border transition-all duration-300",
            step.status === "running" && "bg-primary/20 border-primary animate-pulse scale-105",
            step.status === "passed" && "bg-emerald-500/10 border-emerald-500/30 text-emerald-500",
            step.status === "failed" && "bg-red-500/10 border-red-500/30 text-red-500",
            step.status === "pending" && "bg-muted/50 text-muted-foreground"
          )}>
            <Icon className="h-4 w-4" />
          </div>

          {/* Name & Msg */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className={cn(
                "text-xs font-bold transition-colors duration-300",
                step.status === "pending" ? "text-muted-foreground/60" : "text-card-foreground"
              )}>
                {step.name}
              </span>
              {step.status === "running" && (
                <span className="text-[9px] font-extrabold text-primary animate-pulse uppercase tracking-wider">Processing</span>
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
          <div className="shrink-0 min-w-[60px] text-right">
            <StatusIcon status={step.status} />
          </div>

          {/* Expand Chevron */}
          {step.details && (
            <div className="shrink-0 text-muted-foreground transition-transform duration-200">
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
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <Separator className="my-3" />
              <div className="rounded-md border border-border bg-muted/30 p-3 text-[10px] text-muted-foreground font-mono whitespace-pre-wrap leading-relaxed">
                {step.details}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function AnimatedScore({ score }: { score: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = score;
    const duration = 1500;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4); // easeOutQuart
      setDisplay(Math.round(start + (end - start) * eased));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [score]);

  return <span>{display}</span>;
}

function CircularRiskGauge({ score }: { score: number }) {
  const getColor = () => {
    if (score <= 30) return "stroke-emerald-500";
    if (score <= 60) return "stroke-amber-500";
    return "stroke-red-500";
  };
  
  const getTextColor = () => {
    if (score <= 30) return "text-emerald-500";
    if (score <= 60) return "text-amber-500";
    return "text-red-500";
  };

  const getLabel = () => {
    if (score <= 30) return "Low Risk";
    if (score <= 60) return "Medium Risk";
    return "High Risk";
  };

  const strokeDashoffset = 251.2 - (251.2 * score) / 100;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative h-28 w-28 flex items-center justify-center">
        {/* SVG Gauge */}
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="56"
            cy="56"
            r="40"
            className="stroke-muted fill-none"
            strokeWidth="8"
          />
          <motion.circle
            cx="56"
            cy="56"
            r="40"
            className={cn("fill-none transition-all duration-1000 ease-out", getColor())}
            strokeWidth="8"
            strokeDasharray="251.2"
            initial={{ strokeDashoffset: 251.2 }}
            animate={{ strokeDashoffset }}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className={cn("text-2xl font-extrabold font-mono", getTextColor())}>
            <AnimatedScore score={score} />
          </span>
          <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wide">Risk Score</span>
        </div>
      </div>
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        Risk Assessment: <span className={cn("font-extrabold", getTextColor())}>{getLabel()}</span>
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
      return <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-600 bg-emerald-500/10 font-bold px-3 py-1 rounded-full uppercase tracking-wider">Approved</Badge>;
    }
    if (dec === "rejected") {
      return <Badge variant="outline" className="text-xs border-red-500/30 text-red-600 bg-red-500/10 font-bold px-3 py-1 rounded-full uppercase tracking-wider">Rejected</Badge>;
    }
    return <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-600 bg-amber-500/10 font-bold px-3 py-1 rounded-full uppercase tracking-wider">Pending Review</Badge>;
  };

  const isApproved = result?.decision.toLowerCase() === "approved";

  return (
    <div className="min-h-screen py-16 px-4 bg-gradient-to-b from-background via-background to-muted/20 relative">
      {/* Confetti celebration for approved vendors */}
      {isComplete && result && isApproved && <ConfettiEffect />}

      <div className="mx-auto max-w-2xl space-y-6 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-extrabold tracking-tight text-card-foreground flex items-center gap-2">
              Verification Engine
              {!isComplete && <Loader2 className="h-4.5 w-4.5 animate-spin text-primary shrink-0" />}
            </h1>
            <p className="text-muted-foreground font-mono text-[9px] bg-muted px-2 py-0.5 rounded border select-all max-w-max">
              ID: {id}
            </p>
          </div>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider bg-card border px-2.5 py-1 rounded-full shadow-sm">
            {completedSteps}/{totalSteps} checks run
          </span>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <Progress
            value={progressPercent}
            className="h-2 shadow-none border bg-muted rounded-full overflow-hidden"
            indicatorClassName={cn(
              "transition-all duration-500 ease-out",
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
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-red-500/30 bg-red-500/5">
              <CardContent className="flex items-center gap-3 py-3.5 text-xs">
                <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                <div className="text-muted-foreground font-semibold">{error}</div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Steps timeline list */}
        <div className="space-y-2.5">
          <AnimatePresence mode="popLayout">
            {steps.map((step, i) => (
              <StepRow key={step.name} step={step} index={i} />
            ))}
          </AnimatePresence>

          {!isComplete && steps.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Loader2 className="h-8 w-8 text-primary animate-spin mb-3" />
              <p className="text-xs text-muted-foreground font-semibold animate-pulse">Initializing stream connection...</p>
            </div>
          )}
        </div>

        {/* Result Card */}
        <AnimatePresence>
          {isComplete && result && (
            <motion.div
              initial={{ opacity: 0, y: 25, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, type: "spring" }}
            >
              <Card className="glowing-card shadow-xl overflow-hidden">
                <CardHeader className="pb-4 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-extrabold uppercase tracking-wider text-card-foreground">Evaluation Report</CardTitle>
                      <CardDescription className="text-xs">Compliance risk profile summary and decision recommendations.</CardDescription>
                    </div>
                    {getDecisionBadge()}
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-6 text-xs">
                  {/* Gauge */}
                  <div className="flex justify-center p-4 border rounded-xl bg-muted/10 shadow-inner">
                    <CircularRiskGauge score={result.riskScore} />
                  </div>

                  {/* Issues */}
                  {result.issues.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Verification Warning Details</h3>
                      <div className="grid gap-2">
                        {result.issues.map((issue, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3.5 text-muted-foreground leading-relaxed shadow-sm"
                          >
                            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                            <span>{issue}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI Reasoning */}
                  <div className="space-y-2">
                    <h3 className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Review Summary</h3>
                    <div className="rounded-lg border bg-muted/20 p-4 text-muted-foreground leading-relaxed font-semibold">
                      {result.reasoning}
                    </div>
                  </div>

                  <Separator />

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button asChild size="sm" className="flex-1 font-semibold transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0">
                      <Link href="/dashboard">
                        <BarChart3 className="h-4 w-4 shrink-0 mr-1.5" />
                        Go to Dashboard
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm" className="flex-1 font-semibold transition-all duration-300 hover:bg-muted hover:-translate-y-0.5 active:translate-y-0">
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
