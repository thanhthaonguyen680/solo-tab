"use client";

import { useActionState } from "react";
import { login, type LoginState } from "../actions";
import { buttonPrimary, FieldError, inputClass } from "../ui";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});

  return (
    <form
      action={action}
      className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6"
    >
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-bold">Mật khẩu</span>
        <input
          type="password"
          name="password"
          required
          autoFocus
          autoComplete="current-password"
          aria-invalid={Boolean(state.error)}
          aria-describedby="password-error"
          className={inputClass}
        />
        <FieldError id="password-error" message={state.error} />
      </label>
      <button type="submit" disabled={pending} className={buttonPrimary}>
        {pending ? "Đang kiểm tra…" : "Đăng nhập"}
      </button>
    </form>
  );
}
