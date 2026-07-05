"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface ProcessingStep {
  name: string;
  status: "pending" | "running" | "passed" | "failed" | "warning" | "skipped";
  message?: string;
  details?: string;
  duration?: number;
  timestamp?: string;
}

interface ProcessingResult {
  decision: string;
  riskScore: number;
  issues: string[];
  reasoning: string;
}

interface UseProcessingStreamReturn {
  steps: ProcessingStep[];
  isComplete: boolean;
  error: string | null;
  result: ProcessingResult | null;
  startProcessing: () => void;
}

export function useProcessingStream(vendorId: string): UseProcessingStreamReturn {
  const [steps, setSteps] = useState<ProcessingStep[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const hasStarted = useRef(false);

  const startProcessing = useCallback(async () => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    setSteps([]);
    setIsComplete(false);
    setError(null);
    setResult(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch(`/api/vendors/${vendorId}/process`, {
        method: "POST",
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Processing failed (${response.status})`);
      }

      if (!response.body) {
        throw new Error("No response stream available");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;

          const data = trimmed.slice(6);
          if (data === "[DONE]") {
            setIsComplete(true);
            continue;
          }

          try {
            const event = JSON.parse(data);

            if (event.type === "step") {
              // API sends step data spread at top level: { type: "step", stepName, status, message, details, duration, timestamp }
              const stepName: string = event.stepName || "Processing...";
              const rawStatus = (event.status || "running").toLowerCase();
              
              // Skip placeholder steps
              if (stepName === "Processing..." || stepName === "Initializing...") continue;

              const stepData: ProcessingStep = {
                name: stepName,
                status: rawStatus as ProcessingStep["status"],
                message: event.message,
                details: event.details
                  ? typeof event.details === "string"
                    ? event.details
                    : JSON.stringify(event.details, null, 2)
                  : undefined,
                duration: event.duration,
                timestamp: event.timestamp,
              };

              setSteps((prev) => {
                const existing = prev.findIndex((s) => s.name === stepName);
                if (existing >= 0) {
                  const updated = [...prev];
                  updated[existing] = { ...updated[existing], ...stepData };
                  return updated;
                }
                return [...prev, stepData];
              });
            } else if (event.type === "complete") {
              // API sends type "complete" with decision, riskScore, reasoning, issues
              const issuesRaw = event.issues || [];
              const issues: string[] = Array.isArray(issuesRaw)
                ? issuesRaw.map((issue: { message?: string; stepName?: string } | string) =>
                    typeof issue === "string" ? issue : issue.message || JSON.stringify(issue)
                  )
                : [];
              
              setResult({
                decision: event.decision,
                riskScore: event.riskScore,
                reasoning: event.reasoning || "",
                issues,
              });
              setIsComplete(true);
            } else if (event.type === "error") {
              setError(event.error || event.message || "An error occurred during processing");
            }
            // "start" event is ignored
          } catch {
            // Skip malformed JSON
          }
        }
      }

      setIsComplete(true);
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        setError(err.message);
      }
      hasStarted.current = false;
    }
  }, [vendorId]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      hasStarted.current = false;
    };
  }, []);

  return { steps, isComplete, error, result, startProcessing };
}
