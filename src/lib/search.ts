/** Bỏ dấu tiếng Việt + viết thường, để "bèo dạt" khớp với "beo dat". */
export function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

export function matches(query: string, fields: (string | undefined)[]) {
  const q = normalize(query);
  if (!q) return true;
  const haystack = normalize(fields.filter(Boolean).join(" "));
  return q.split(/\s+/).every((word) => haystack.includes(word));
}
