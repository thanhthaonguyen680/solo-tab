export const site = {
  name: "solo.tab",
  tagline: "Kho tab guitar solo & melody",
  description:
    "Tab guitar solo và melody, có audio mẫu, cập nhật mỗi tuần.",
  // TODO: thay bằng giá và kênh liên hệ thật
  pricePerMonth: 25000,
  contact: {
    label: "Liên hệ",
    href: "mailto:thanhthaonguyen680@gmail.com",
  },
} as const;

export const collections = {
  solo: {
    slug: "solo",
    title: "Solo",
    blurb: "Fingerstyle, intro, đoạn solo — chơi một mình vẫn đầy đủ.",
  },
  melody: {
    slug: "melody",
    title: "Melody",
    blurb: "Giai điệu chính của bài hát, dễ bắt đầu, dễ đệm cùng.",
  },
} as const;

export type CollectionSlug = keyof typeof collections;

export function isCollectionSlug(value: string): value is CollectionSlug {
  return Object.hasOwn(collections, value);
}

export function formatVnd(amount: number) {
  return amount.toLocaleString("vi-VN") + "đ";
}
