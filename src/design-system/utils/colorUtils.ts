/** Convert a 3- or 6-digit hex string to HSL components. */
export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const clean = hex.replace(/^#/, "");
  const full = clean.length === 3
    ? clean.split("").map((c) => c + c).join("")
    : clean;

  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }

  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  return { h, s: s * 100, l: l * 100 };
}

/** Convert HSL components to a hex string. */
export function hslToHex(h: number, s: number, l: number): string {
  const sn = s / 100;
  const ln = l / 100;
  const a = sn * Math.min(ln, 1 - ln);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = ln - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/**
 * Compute the relative luminance of a hex colour per WCAG 2.1.
 * https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
function relativeLuminance(hex: string): number {
  const clean = hex.replace(/^#/, "");
  const full = clean.length === 3
    ? clean.split("").map((c) => c + c).join("")
    : clean;

  const toLinear = (c: number) => {
    const srgb = c / 255;
    return srgb <= 0.04045 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
  };

  const r = toLinear(parseInt(full.slice(0, 2), 16));
  const g = toLinear(parseInt(full.slice(2, 4), 16));
  const b = toLinear(parseInt(full.slice(4, 6), 16));

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.1 contrast ratio between two hex colours. */
function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Return '#000' or '#fff', whichever achieves a higher WCAG contrast ratio
 * against the supplied background hex. Falls back to '#fff' on parse errors.
 */
export function getAccessibleTextColor(bgHex: string): "#000" | "#fff" {
  try {
    const contrastWithWhite = contrastRatio(bgHex, "#ffffff");
    const contrastWithBlack = contrastRatio(bgHex, "#000000");
    return contrastWithBlack >= contrastWithWhite ? "#000" : "#fff";
  } catch {
    return "#fff";
  }
}

/**
 * Derive the three accent shades and an accessible foreground colour from
 * a single user-supplied hex. Hue is preserved; only lightness is adjusted.
 *
 *   accent-200: +30 lightness (tinted background)
 *   accent-500: original hex (primary interactive colour)
 *   accent-600: −12 lightness (hover / focus ring)
 */
export function deriveAccentShades(hex: string): {
  accent200: string;
  accent500: string;
  accent600: string;
  textOnAccent: "#000" | "#fff";
} {
  const { h, s, l } = hexToHsl(hex);
  const accent200 = hslToHex(h, Math.min(100, s), Math.min(95, l + 30));
  const accent500 = hslToHex(h, s, l);
  const accent600 = hslToHex(h, Math.max(0, s), Math.max(0, l - 12));
  const textOnAccent = getAccessibleTextColor(accent500);
  return { accent200, accent500, accent600, textOnAccent };
}
