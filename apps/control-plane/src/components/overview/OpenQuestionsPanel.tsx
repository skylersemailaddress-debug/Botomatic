"use client";

import { useEffect, useState } from "react";
import Panel from "@/components/ui/Panel";
import { getSpecStatus } from "@/services/spec";

export default function OpenQuestionsPanel({ projectId }: { projectId: string }) {
  const [questions, setQuestions] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const status = await getSpecStatus(projectId);
        setQuestions(Array.isArray(status?.spec?.openQuestions) ? status.spec.openQuestions : []);
      } catch {
        setQuestions([]);
      }
    };
    void load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [projectId]);

  return (
    <Panel title="Open Questions">
      {questions.length === 0 ? <div style={{ fontSize: 12 }}>No open questions.</div> : null}
      {questions.slice(0, 7).map((q, i) => (
        <div key={i} style={{ fontSize: 12, marginBottom: 4 }}>{q}</div>
      ))}
    </Panel>
  );
}
