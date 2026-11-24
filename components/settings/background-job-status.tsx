"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { getBackgroundJobAction } from "@/app/actions/background-jobs";

type Job = {
  id: string;
  title: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  progress: number;
  total: number;
  processed: number;
  message: string | null;
  error: string | null;
};

export function BackgroundJobStatus({ jobId, onDone }: { jobId: string; onDone?: (job: Job) => void }) {
  const [job, setJob] = useState<Job | null>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      try {
        const j = await getBackgroundJobAction(jobId);
        if (!active || !j) return;
        const next = j as Job;
        setJob(next);
        if ((next.status === "completed" || next.status === "failed" || next.status === "cancelled") && !doneRef.current) {
          doneRef.current = true;
          onDone?.(next);
          return;
        }
        if (next.status === "completed" || next.status === "failed" || next.status === "cancelled") return;
      } catch { /* ignore transient */ }
      timer = setTimeout(poll, 1500);
    };
    poll();
    return () => { active = false; if (timer) clearTimeout(timer); };
  }, [jobId, onDone]);

  if (!job) return <div className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Carregando status...</div>;

  const pct = job.total > 0 ? Math.min(100, Math.round((job.processed / job.total) * 100)) : job.progress;
  const done = job.status === "completed";
  const failed = job.status === "failed";

  return (
    <div className="space-y-2 rounded-md border p-3">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-medium">{job.title}</span>
        <span className="text-muted-foreground">{pct}%</span>
      </div>
      <div className="h-2 w-full rounded bg-muted overflow-hidden">
        <div className={`h-full transition-all ${failed ? "bg-destructive" : "bg-primary"}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {done ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : failed ? <XCircle className="h-4 w-4 text-destructive" /> : <Loader2 className="h-4 w-4 animate-spin" />}
        <span>{job.message ?? job.status}{job.total ? ` (${job.processed}/${job.total})` : ""}</span>
      </div>
      {job.error && <p className="text-xs text-destructive">{job.error}</p>}
    </div>
  );
}
