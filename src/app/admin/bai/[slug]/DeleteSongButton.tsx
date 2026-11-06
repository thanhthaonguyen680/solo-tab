"use client";

import { useFormStatus } from "react-dom";

export function DeleteSongButton({ title, action }: { title: string; action: () => Promise<void> }) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(`Xoá bài “${title}”? Không thể hoàn tác.`)) e.preventDefault();
      }}
    >
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg border border-red-500/40 bg-bg px-4 py-2 text-sm font-semibold text-red-400 transition-colors hover:border-red-500 disabled:opacity-60"
    >
      {pending ? "Đang xoá…" : "Xoá bài"}
    </button>
  );
}
