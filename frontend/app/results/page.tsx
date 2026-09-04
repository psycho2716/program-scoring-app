"use client";

import { useCallback, useEffect, useState } from "react";
import { CrownResultsStage, ResultsHoldingScreen } from "@/components/results/crown-results-stage";
import type { CrownResultsDisplay } from "@/types";

const emptyDisplay: CrownResultsDisplay = {
  revealed: false,
  pageantName: "Mr. and Miss Katimugan",
  year: 2026,
  female: [],
  male: [],
};

export default function ProjectorResultsPage() {
  const [data, setData] = useState<CrownResultsDisplay>(emptyDisplay);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/results", { cache: "no-store" });
      const json = (await response.json()) as { success?: boolean; data?: CrownResultsDisplay };
      if (!json.data) return;
      setData({
        revealed: Boolean(json.data.revealed),
        pageantName: json.data.pageantName || emptyDisplay.pageantName,
        year: json.data.year || 2026,
        female: json.data.female ?? [],
        male: json.data.male ?? [],
      });
    } catch {
      // Keep the last frame if the network blips.
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => {
      void load();
    }, 2000);
    return () => window.clearInterval(id);
  }, [load]);

  if (!data.revealed) {
    return <ResultsHoldingScreen pageantName={data.pageantName} year={data.year} />;
  }

  return <CrownResultsStage data={data} />;
}
