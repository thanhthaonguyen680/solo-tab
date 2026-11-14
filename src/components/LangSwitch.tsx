"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect } from "react";
import { counterpart, dict, type Lang } from "@/i18n";

const pill = "flex h-9 shrink-0 items-center rounded-lg border border-border px-0.5 font-mono text-xs font-bold sm:px-1";

/** Nút VI / EN: chuyển sang đúng trang tương ứng ở ngôn ngữ kia */
export function LangSwitch({ lang }: { lang: Lang }) {
  // Trang có tham số động chưa dựng sẵn (vd. /tac-gia/[id]) chỉ biết đường dẫn khi có request
  return (
    <Suspense fallback={<Switch lang={lang} href={lang === "en" ? "/" : "/en"} />}>
      <PathAwareSwitch lang={lang} />
    </Suspense>
  );
}

function PathAwareSwitch({ lang }: { lang: Lang }) {
  return <Switch lang={lang} href={counterpart(usePathname())} />;
}

function Switch({ lang, href }: { lang: Lang; href: string }) {
  const other: Lang = lang === "en" ? "vi" : "en";
  return (
    <Link href={href} hrefLang={other} lang={other} title={dict[lang].switchTo} className={pill}>
      {/* Tên đọc cho trình đọc màn hình = chữ hiển thị (VI EN) + câu giải thích — không dùng aria-label đè chữ */}
      <span className="sr-only">{dict[lang].switchTo}: </span>
      {/* Điện thoại: chỉ hiện ngôn ngữ sẽ chuyển sang, cho vừa thanh menu */}
      {(["vi", "en"] as const).map((l) => (
        <span
          key={l}
          className={`rounded-md px-1.5 py-1 ${
            l === lang ? "hidden bg-accent text-accent-fg sm:inline" : "text-soft transition-colors hover:text-text"
          }`}
        >
          {l.toUpperCase()}
        </span>
      ))}
    </Link>
  );
}

/** Thẻ <html lang> nằm ở layout gốc (dùng chung) — cập nhật theo ngôn ngữ của trang đang xem */
export function HtmlLang({ lang }: { lang: Lang }) {
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return null;
}
