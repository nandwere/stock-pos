// lib/hooks/use-credit-summary.ts
import { useEffect, useState } from 'react';

export function useCreditSummary() {
  const [overdueCount, setOverdueCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/sales/credit/summary');
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setOverdueCount(data.overdueCount ?? 0);
      } catch {
        // silent — a failed badge fetch shouldn't disrupt nav rendering
      }
    };
    load();
    const interval = setInterval(load, 60_000); // refresh every minute
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  return overdueCount;
}