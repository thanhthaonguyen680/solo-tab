"use client";

import { useActionState, useState } from "react";
import { buttonPrimary, FieldError, inputClass } from "@/app/admin/ui";
import { login, register, type AuthState } from "./actions";

/** Đăng nhập / đăng ký bằng tên đăng nhập + mật khẩu (không cần email) */
export function AuthForms({ next, initialMode }: { next: string; initialMode: "login" | "register" }) {
  const [mode, setMode] = useState(initialMode);
  return (
    <div className="flex flex-col gap-5">
      <div role="tablist" aria-label="Đăng nhập hoặc đăng ký" className="grid grid-cols-2 rounded-xl border border-border bg-surface p-1">
        {(["login", "register"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={`rounded-lg py-2 text-sm font-semibold transition-colors ${
              mode === m ? "bg-accent text-accent-fg" : "text-soft hover:text-text"
            }`}
          >
            {m === "login" ? "Đăng nhập" : "Đăng ký"}
          </button>
        ))}
      </div>
      {mode === "login" ? <LoginForm next={next} /> : <RegisterForm next={next} />}
    </div>
  );
}

function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(login, {} as AuthState);
  return (
    <form action={action} className="flex flex-col gap-4" aria-label="Đăng nhập">
      <input type="hidden" name="next" value={next} />
      <Field label="Tên đăng nhập" id="login-username">
        <input id="login-username" name="username" autoComplete="username" required autoCapitalize="none" defaultValue={state.username} className={inputClass} />
      </Field>
      <Field label="Mật khẩu" id="login-password">
        <input id="login-password" name="password" type="password" autoComplete="current-password" required className={inputClass} />
      </Field>
      <FieldError id="login-error" message={state.error} />
      <button type="submit" disabled={pending} className={buttonPrimary}>
        {pending ? "Đang đăng nhập…" : "Đăng nhập"}
      </button>
    </form>
  );
}

function RegisterForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(register, {} as AuthState);
  const bad = (f: AuthState["field"]) => (state.field === f ? { "aria-invalid": true, "aria-describedby": "register-error" } : {});
  return (
    <form action={action} className="flex flex-col gap-4" aria-label="Đăng ký">
      <input type="hidden" name="next" value={next} />
      {/* Ô bẫy bot — ẩn với người dùng */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      <Field label="Tên đăng nhập" id="register-username" hint="3–30 ký tự: chữ thường không dấu, số, dấu chấm, gạch dưới. Hiện làm tên người soạn tab.">
        <input
          id="register-username"
          name="username"
          autoComplete="username"
          required
          autoCapitalize="none"
          pattern="[a-zA-Z0-9._]{3,30}"
          defaultValue={state.username}
          className={inputClass}
          {...bad("username")}
        />
      </Field>
      <Field label="Mật khẩu" id="register-password" hint="Tối thiểu 6 ký tự">
        <input id="register-password" name="password" type="password" autoComplete="new-password" required minLength={6} className={inputClass} {...bad("password")} />
      </Field>
      <Field label="Nhập lại mật khẩu" id="register-confirm">
        <input id="register-confirm" name="confirm" type="password" autoComplete="new-password" required minLength={6} className={inputClass} {...bad("confirm")} />
      </Field>
      <FieldError id="register-error" message={state.error} />
      <button type="submit" disabled={pending} className={buttonPrimary}>
        {pending ? "Đang tạo tài khoản…" : "Tạo tài khoản"}
      </button>
    </form>
  );
}

function Field({ label, id, hint, children }: { label: string; id: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-bold">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}
