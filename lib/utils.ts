import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
}

export function normalizeClientName(input: string): string {
  const cleaned = (input ?? "").trim().replace(/\s+/g, " ");
  if (!cleaned) return cleaned;

  const lowercaseWords = new Set(["de", "a", "al"]);

  const normalizeToken = (token: string) => {
    const leading = token.match(/^[^\p{L}\p{N}]*/u)?.[0] ?? "";
    const trailing = token.match(/[^\p{L}\p{N}]*$/u)?.[0] ?? "";
    const core = token.slice(leading.length, token.length - trailing.length);
    if (!core) return token;

    const coreLower = core.toLocaleLowerCase("es-CL").replace(/\./g, "");
    const trailingWithoutDots = trailing.replace(/\./g, "");

    if (lowercaseWords.has(coreLower)) return `${leading}${coreLower}${trailingWithoutDots}`;
    if (coreLower === "sa") return `${leading}SA${trailingWithoutDots}`;
    if (coreLower === "ltda") return `${leading}LTDA.${trailingWithoutDots}`;
    if (coreLower === "spa") return `${leading}SPA${trailingWithoutDots}`;

    const cap = (s: string) => {
      const t = s.trim();
      if (!t) return t;
      return t.charAt(0).toLocaleUpperCase("es-CL") + t.slice(1).toLocaleLowerCase("es-CL");
    };

    const coreNormalized = core
      .split("-")
      .map((part) => cap(part))
      .join("-");

    return `${leading}${coreNormalized}${trailing}`;
  };

  return cleaned.split(" ").map((w) => normalizeToken(w)).join(" ");
}
