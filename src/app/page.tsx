"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Shield,
  Zap,
  Brain,
  FileCheck,
  Clock,
  Eye,
  ArrowRight,
  Send,
  Search,
  FileText,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Shield,
    title: "Compliance Verification",
    description: "Automated regulatory compliance checks across multiple jurisdictions with real-time validation.",
  },
  {
    icon: Zap,
    title: "Instant Processing",
    description: "AI-driven document analysis completes in seconds, reducing onboarding time by 90%.",
  },
  {
    icon: Brain,
    title: "Intelligent Risk Scoring",
    description: "Multi-factor risk assessment powered by machine learning models trained on compliance data.",
  },
  {
    icon: FileCheck,
    title: "Document Extraction",
    description: "OCR and NLP-powered data extraction from certificates, tax documents, and financial records.",
  },
  {
    icon: Clock,
    title: "Real-Time Tracking",
    description: "Live pipeline visualization showing every step of the document verification process.",
  },
  {
    icon: Eye,
    title: "Audit Trail",
    description: "Complete transparency with immutable logs for every decision and compliance action taken.",
  },
];

const workflowSteps = [
  {
    step: 1,
    icon: Send,
    title: "Submit Profile",
    description: "Vendor fills out the intake form and uploads required registration documents.",
  },
  {
    step: 2,
    icon: Search,
    title: "Analyze & Parse",
    description: "OCR parses data, verifies tax IDs, bank info, and compares names across files.",
  },
  {
    step: 3,
    icon: FileText,
    title: "Audit Review",
    description: "Risk score is dynamically calculated and discrepancy details are highlighted.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-muted/10">
      {/* Hero Section */}
      <section className="relative py-24 sm:py-32 px-4 flex flex-col items-center justify-center text-center max-w-4xl mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-bold text-primary uppercase tracking-wider"
        >
          <Sparkles className="h-3 w-3" />
          Enterprise Compliance Intelligence
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="text-4xl sm:text-5xl font-extrabold tracking-tight text-card-foreground leading-tight"
        >
          Streamline Vendor Onboarding <br />
          <span className="text-muted-foreground font-normal">With Automated Document Audits</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-sm sm:text-base text-muted-foreground max-w-2xl leading-relaxed font-medium"
        >
          Automate credential intake, verify bank details, audit tax certificates, and assess onboarding risks in minutes instead of weeks. Powered by deterministic parsing logic.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="flex flex-wrap items-center justify-center gap-3"
        >
          <Button asChild size="sm" className="font-semibold px-6">
            <Link href="/onboarding">
              Begin Intake Form
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="font-semibold px-6">
            <Link href="/dashboard">Access Dashboard</Link>
          </Button>
        </motion.div>

        {/* Stats Row */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="pt-10 grid grid-cols-3 gap-6 max-w-md mx-auto w-full border-t border-border/50"
        >
          {[
            { value: "90%", label: "Time Saved" },
            { value: "0", label: "Type Errors" },
            { value: "100%", label: "Audit Logs" },
          ].map((stat) => (
            <div key={stat.label} className="text-center space-y-0.5">
              <div className="text-lg sm:text-xl font-bold font-mono text-card-foreground">{stat.value}</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Feature Grid Section */}
      <section className="py-20 px-4 bg-muted/20 border-y border-border/40">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold tracking-tight text-card-foreground">Audit Verification Pipeline</h2>
            <p className="text-xs text-muted-foreground max-w-md mx-auto font-medium">
              Enterprise compliance features to ensure clean, structured, and auditable registrations.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-lg border bg-card p-5 transition-colors hover:border-indigo-500/20 space-y-3"
              >
                <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                  <feature.icon className="h-4 w-4 text-primary" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-card-foreground">{feature.title}</h3>
                  <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold tracking-tight text-card-foreground">Verification Lifecycle</h2>
            <p className="text-xs text-muted-foreground max-w-md mx-auto font-medium">
              Intelligent and automated validation in 3 structured phases.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {workflowSteps.map((step) => (
              <div key={step.step} className="rounded-lg border bg-card p-5 space-y-3 text-center flex flex-col items-center">
                <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center border font-mono text-xs font-bold text-muted-foreground">
                  {step.step}
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-card-foreground">{step.title}</h3>
                  <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
