"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getBackgroundJobsAction } from "@/app/actions/background-jobs";
import { BackgroundJobStatus } from "@/components/settings/background-job-status";

type Job = { id: string; title: string; status: string };

export function GlobalJobStatus() {
  const pathname = usePathname();
  const [jobId, setJobId] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const jobs = await getBackgroundJobsAction() as Job[];
      const active = jobs.find((j) => j.status === "pending" || j.status === "running");
      if (active) { setJobId(active.id); setHidden(false); }
      else if (!active) setJobId((cur) => cur);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { refresh(); }, [refresh, pathname]);
  useEffect(() => {
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, [refresh]);

  if (!jobId || hidden || pathname === "/settings") return null;

  return (
    <div className="fixed bottom-4 right-4 z-[60] w-[min(24rem,calc(100vw-2rem))] shadow-lg">
      <div className="rounded-xl bg-popover">
        <BackgroundJobStatus jobId={jobId} onDone={() => setHidden(true)} />
      </div>
    </div>
  );
}
