"use server";

import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import {
  hashPassword,
  PASSWORD_MIN,
  safeNext,
  startMemberSession,
  USERNAME_PATTERN,
  verifyPassword,
} from "@/lib/member-auth";

export type AuthState = { error?: string; field?: "username" | "password" | "confirm"; username?: string };

const clean = (form: FormData, name: string) => String(form.get(name) ?? "");
const slow = () => new Promise((r) => setTimeout(r, 700)); // làm chậm việc dò mật khẩu

export async function login(_prev: AuthState, form: FormData): Promise<AuthState> {
  const username = clean(form, "username").trim().toLowerCase();
  const password = clean(form, "password");
  if (!username || !password) return { error: "Nhập tên đăng nhập và mật khẩu", username };

  const [user] = await sql`select id::int as id, password_hash as "hash", is_banned as "banned" from users where username = ${username}`;
  if (!user || !(await verifyPassword(password, user.hash))) {
    await slow();
    return { error: "Sai tên đăng nhập hoặc mật khẩu", username };
  }
  if (user.banned) return { error: "Tài khoản này đã bị khoá", username };

  await sql`update users set last_login_at = now() where id = ${user.id}`;
  await startMemberSession(user.id);
  redirect(safeNext(form.get("next")));
}

export async function register(_prev: AuthState, form: FormData): Promise<AuthState> {
  // Ô ẩn chống bot: người thật không thấy nên để trống
  if (clean(form, "website")) return { error: "Không tạo được tài khoản" };

  const username = clean(form, "username").trim().toLowerCase();
  const password = clean(form, "password");
  const confirm = clean(form, "confirm");
  if (!USERNAME_PATTERN.test(username)) {
    return {
      error: "Tên đăng nhập 3–30 ký tự, chỉ gồm chữ thường không dấu, số, dấu chấm hoặc gạch dưới",
      field: "username",
      username,
    };
  }
  if (password.length < PASSWORD_MIN) return { error: `Mật khẩu tối thiểu ${PASSWORD_MIN} ký tự`, field: "password", username };
  if (password.length > 200) return { error: "Mật khẩu quá dài", field: "password", username };
  if (password !== confirm) return { error: "Hai lần nhập mật khẩu không khớp", field: "confirm", username };

  const rows = await sql`
    insert into users (username, password_hash) values (${username}, ${await hashPassword(password)})
    on conflict (username) do nothing
    returning id::int as id`;
  if (!rows.length) return { error: "Tên đăng nhập này đã có người dùng — chọn tên khác", field: "username", username };

  await startMemberSession(rows[0].id);
  redirect(safeNext(form.get("next")));
}
