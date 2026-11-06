import { buttonPrimary as primary, buttonSecondary as secondary } from "@/components/buttons";

/** Class dùng chung cho các ô nhập và nút trong trang admin */
export const inputClass =
  "h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none transition-colors placeholder:text-muted focus:border-accent aria-invalid:border-red-500";

export const buttonPrimary = primary();

export const buttonSecondary = secondary();

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-sm font-medium text-red-400">
      {message}
    </p>
  );
}
