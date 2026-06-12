/**
 * Minimal className joiner. Accepts strings, falsy values and arrays;
 * returns a single space-separated string. Keeps a tiny footprint so we
 * avoid pulling in clsx/twMerge for a className-only RN project.
 */
type ClassValue = string | number | null | false | undefined | ClassValue[];

export function cn(...inputs: ClassValue[]): string {
  const out: string[] = [];
  for (const input of inputs) {
    if (!input) continue;
    if (Array.isArray(input)) {
      const nested = cn(...input);
      if (nested) out.push(nested);
    } else {
      out.push(String(input));
    }
  }
  return out.join(" ");
}
