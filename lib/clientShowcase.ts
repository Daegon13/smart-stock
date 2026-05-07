export const SHOWCASE_READONLY_NOTICE = "Demo pública: acciones de escritura desactivadas.";

export function isClientShowcaseReadonly() {
  const showcase = process.env.NEXT_PUBLIC_SHOWCASE_MODE === "true";
  const explicitReadonly = process.env.NEXT_PUBLIC_SHOWCASE_READONLY;
  return showcase && explicitReadonly !== "false";
}
