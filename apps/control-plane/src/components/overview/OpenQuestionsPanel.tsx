"use client";

import { useEffect, useState } from "react";
import Panel from "@/components/ui/Panel";
import { getSpecStatus } from "@/services/spec";
import EmptyState from "@/components/ui/EmptyState";

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
    <Panel title="Open Questions" subtitle="Spec ambiguity requiring decisions">
      {questions.length === 0 ? <EmptyState title="No open questions" detail="Spec has no unresolved questions at the moment." /> : null}
      {questions.length > 0 ? (
        <ol className="list-plain">
          {questions.slice(0, 7).map((q, i) => (
            <li key={i} style={{ fontSize: 12, marginBottom: 6 }}>{q}</li>
          ))}
        </ol>
      ) : null}
    </Panel>
  );
}
