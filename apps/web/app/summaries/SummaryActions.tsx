"use client";

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
