function srgbToLinear(c: number) {
  c /= 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function hexToOklch(hex: string): { l: number; c: number; h: number } {
  const clean = hex.replace("#", "");
  const r = srgbToLinear(parseInt(clean.substring(0, 2), 16));
  const g = srgbToLinear(parseInt(clean.substring(2, 4), 16));
  const b = srgbToLinear(parseInt(clean.substring(4, 6), 16));

  // XYZ (D65)
  const x = 0.4124564 * r + 0.3575761 * g + 0.1804375 * b;
  const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
  const z = 0.0193339 * r + 0.119192 * g + 0.9503041 * b;

  // OKLab
  const l_ = Math.cbrt(0.8189330101 * x + 0.3618667424 * y - 0.1288597137 * z);
  const m_ = Math.cbrt(0.0329845436 * x + 0.9293118715 * y + 0.0361456387 * z);
  const s_ = Math.cbrt(0.0482003018 * x + 0.2643662691 * y + 0.6338581749 * z);
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const bb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
  const C = Math.sqrt(a * a + bb * bb);
  let H = (Math.atan2(bb, a) * 180) / Math.PI;
  if (H < 0) H += 360;
  return { l: L, c: C, h: H };
}

export function idealForeground(hex: string): string {
  const { l } = hexToOklch(hex);
  return l > 0.6 ? "oklch(0.22 0.035 255)" : "oklch(0.99 0 0)";
}

export function applyThemeColor(hex: string) {
  if (typeof document === "undefined") return;
  const { l, c, h } = hexToOklch(hex);
  const fg = idealForeground(hex);
  const root = document.documentElement;
  root.style.setProperty("--primary", `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${h.toFixed(1)})`);
  root.style.setProperty("--primary-foreground", fg);
  root.style.setProperty("--ring", `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${h.toFixed(1)})`);
  root.style.setProperty("--accent", `oklch(${Math.max(l - 0.05, 0.1).toFixed(3)} ${c.toFixed(3)} ${h.toFixed(1)})`);
  root.style.setProperty("--accent-foreground", fg);
  root.style.setProperty("--sidebar-primary", `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${h.toFixed(1)})`);
  root.style.setProperty("--sidebar-primary-foreground", fg);
  root.style.setProperty("--sidebar-ring", `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${h.toFixed(1)})`);
}

export const THEME_PRESETS = [
  { name: "Padrão", color: "#171717" },
  { name: "Ocean", color: "#0ea5e9" },
  { name: "Sunset", color: "#f97316" },
  { name: "Forest", color: "#22c55e" },
  { name: "Midnight", color: "#6366f1" },
  { name: "Rose", color: "#ec4899" },
  { name: "Amber", color: "#f59e0b" },
  { name: "Violet", color: "#8b5cf6" },
  { name: "Teal", color: "#14b8a6" },
];
