export function validatePhone(phone: string, operator: "MTN" | "ORANGE"): string | null {
  const cleaned = phone.replace(/[\s\+\-]/g, "");
  const digitsOnly = cleaned.replace(/^237/, "");

  if (digitsOnly.length !== 9) return "Le numéro doit contenir 9 chiffres après l'indicatif 237";

  if (operator === "MTN") {
    const valid = /^6[78]\d{7}$/.test(digitsOnly);
    if (!valid) return "Ce numéro n'est pas un numéro MTN valide (doit commencer par 67 ou 68)";
  }

  if (operator === "ORANGE") {
    const valid = /^6[59]\d{7}$/.test(digitsOnly);
    if (!valid) return "Ce numéro n'est pas un numéro Orange valide (doit commencer par 65 ou 69)";
  }

  return null;
}

export function getOperatorFromPhone(phone: string): "MTN" | "ORANGE" | null {
  const cleaned = phone.replace(/[\s\+\-]/g, "").replace(/^237/, "");
  if (/^6[78]/.test(cleaned)) return "MTN";
  if (/^6[59]/.test(cleaned)) return "ORANGE";
  return null;
}

export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/[\s\+\-]/g, "").replace(/^237/, "");
  if (cleaned.length === 9) {
    return `237 ${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
  }
  return phone;
}
