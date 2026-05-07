export const SHOWCASE_READONLY_NOTICE = "Demo pública: acciones de escritura desactivadas.";

export function isClientShowcaseReadonly() {
  const showcase = process.env.NEXT_PUBLIC_SHOWCASE_MODE === "true";
  const explicitReadonly = process.env.NEXT_PUBLIC_SHOWCASE_READONLY;
  return showcase && explicitReadonly !== "false";
}

export const PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://smart-stock-showcase.vercel.app";

export const PUBLIC_CONTACT_URL =
  process.env.NEXT_PUBLIC_CONTACT_URL || "mailto:contacto@marindev.com?subject=Implementaci%C3%B3n%20Smart%20Stock";
