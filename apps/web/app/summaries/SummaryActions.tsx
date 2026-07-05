"use client";

import { useFormStatus } from "react-dom";
import { regenerateSummary } from "./actions";

export function GenerateSummaryForm({ date }: { date: string }) {
  return (
    <form action={regenerateSummary} className="generate-summary-form">
      <input name="date" type="hidden" value={date} />
      <GenerateSummaryButton />
    </form>
  );
}

function GenerateSummaryButton() {
  const { pending } = useFormStatus();

  return (
    <div className="generate-summary-control">
      <button className="button primary" type="submit" disabled={pending} aria-busy={pending}>
        <span className={pending ? "button-spinner" : "button-dot"} aria-hidden="true" />
        {pending ? "正在生成..." : "生成项目记忆"}
      </button>
      {pending ? (
        <div className="submit-progress" role="status" aria-live="polite">
          <span>正在读取多设备记录并生成总结</span>
          <div className="submit-progress-track" aria-hidden="true">
            <div className="submit-progress-bar" />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function CopyMarkdownButton({ summary }: { summary: string }) {
  return (
    <button
      className="button"
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(summary);
      }}
    >
      复制总结
    </button>
  );
}
