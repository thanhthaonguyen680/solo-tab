/**
 * Đặt / đổi mật khẩu admin. Mật khẩu được nhập ẩn, chỉ bản hash (scrypt) được ghi vào .env.local.
 * Lần đầu chạy cũng tạo ADMIN_SESSION_SECRET ngẫu nhiên.
 *
 *   npm run admin:password
 *
 * Đổi mật khẩu sẽ không đăng xuất phiên cũ; muốn đăng xuất mọi nơi thì xoá dòng
 * ADMIN_SESSION_SECRET trong .env.local rồi chạy lại lệnh này.
 */
import { randomBytes, scryptSync } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { stdin, stdout } from "node:process";

const ENV_FILE = new URL("../.env.local", import.meta.url);
const MIN_LENGTH = 12;

function askHidden(question: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!stdin.isTTY) return reject(new Error("Hãy chạy lệnh này trực tiếp trong terminal."));
    stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    let value = "";
    const onData = (chunk: string) => {
      for (const ch of chunk) {
        if (ch === "\r" || ch === "\n") {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off("data", onData);
          stdout.write("\n");
          return resolve(value);
        }
        if (ch === "\u0003") {
          stdout.write("\n");
          process.exit(130);
        }
        if (ch === "\u007f" || ch === "\b") {
          if (value) {
            value = value.slice(0, -1);
            stdout.write("\b \b");
          }
        } else {
          value += ch;
          stdout.write("•");
        }
      }
    };
    stdin.on("data", onData);
  });
}

function setEnv(lines: string[], key: string, value: string) {
  const i = lines.findIndex((l) => l.startsWith(`${key}=`));
  const line = `${key}="${value}"`;
  if (i === -1) lines.push(line);
  else lines[i] = line;
}

const password = await askHidden(`Mật khẩu admin mới (tối thiểu ${MIN_LENGTH} ký tự): `);
if (password.length < MIN_LENGTH) {
  console.error(`✗ Mật khẩu quá ngắn — cần ít nhất ${MIN_LENGTH} ký tự.`);
  process.exit(1);
}
if ((await askHidden("Nhập lại: ")) !== password) {
  console.error("✗ Hai lần nhập không khớp.");
  process.exit(1);
}

const salt = randomBytes(16);
const hash = scryptSync(password, salt, 32);

const lines = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, "utf8").replace(/\n+$/, "").split("\n") : [];
setEnv(lines, "ADMIN_PASSWORD_HASH", `scrypt:${salt.toString("hex")}:${hash.toString("hex")}`);
if (!lines.some((l) => l.startsWith("ADMIN_SESSION_SECRET="))) {
  setEnv(lines, "ADMIN_SESSION_SECRET", randomBytes(32).toString("base64url"));
}
writeFileSync(ENV_FILE, lines.join("\n") + "\n", { mode: 0o600 });

console.log("✓ Đã lưu mật khẩu admin (dạng hash) vào .env.local");
console.log("  Khởi động lại `npm run dev` để áp dụng.");
