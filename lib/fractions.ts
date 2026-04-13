// Smart fraction display: converts decimal to common cooking fractions
const FRACTIONS: [number, string][] = [
  [0, '0'],
  [0.125, '⅛'],
  [0.167, '⅙'],
  [0.2, '⅕'],
  [0.25, '¼'],
  [0.333, '⅓'],
  [0.375, '⅜'],
  [0.4, '⅖'],
  [0.5, '½'],
  [0.6, '⅗'],
  [0.625, '⅝'],
  [0.667, '⅔'],
  [0.7, '⅞'],
  [0.75, '¾'],
  [0.8, '⅘'],
  [0.833, '⅚'],
  [0.875, '⅞'],
  [1, '1'],
];

export function formatFraction(n: number): string {
  if (n === 0) return '0';
  if (n < 0) return `-${formatFraction(-n)}`;

  const whole = Math.floor(n);
  const frac = Math.round((n - whole) * 1000) / 1000;

  // Find closest fraction
  let best = FRACTIONS[0];
  for (const f of FRACTIONS) {
    if (Math.abs(frac - f[0]) < Math.abs(frac - best[0])) {
      best = f;
    }
  }

  if (best[0] === 0) return String(whole || 0);
  if (best[0] === 1) return String(whole + 1);
  if (whole === 0) return best[1];
  return `${whole}${best[1]}`;
}

// Scale a quantity string by a ratio
export function scaleAmount(amount: string, ratio: number): string {
  const parsed = parseFloat(amount);
  if (isNaN(parsed)) return amount;
  const scaled = parsed * ratio;

  // If it's a whole number or simple fraction string, try to preserve format
  if (amount.includes('/')) {
    return formatFraction(scaled);
  }

  // For numeric amounts, scale and format
  if (scaled < 0.1) return formatFraction(scaled);
  if (scaled % 1 === 0) return String(Math.round(scaled));
  return formatFraction(scaled);
}
