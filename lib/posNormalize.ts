export function normName(s: string) {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normCodeLoose(s: string) {
  return String(s ?? "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/[-_]/g, "")
    .toUpperCase();
}

export function digitsOnly(s: string) {
  const d = String(s ?? "").replace(/\D/g, "");
  return d;
}

/**
 * Variantes pensadas para POS uruguayos:
 * - Algunos exportan EAN con ceros a la izquierda
 * - Otros lo exportan sin ceros / con espacios o guiones
 */
export function codeVariants(raw: string) {
  const out: string[] = [];
  const push = (v: string) => {
    const k = (v ?? "").trim();
    if (!k) return;
    if (!out.includes(k)) out.push(k);
  };

  const a = normCodeLoose(raw);
  push(a);

  const d = digitsOnly(raw);
  if (d) {
    push(d);

    // sin ceros a la izquierda (si es numérico)
    const no0 = d.replace(/^0+/, "");
    if (no0 && no0 !== d) push(no0);

    // ean-13: algunos POS cortan ceros
    if (d.length < 13 && d.length >= 8) push(d.padStart(13, "0"));

    if (d.length === 13 && d.startsWith("0")) push(d.slice(1));
  }

  // versión alfanumérica sin ceros iniciales (solo si todo es digits)
  if (a && /^[0-9]+$/.test(a)) {
    const no0a = a.replace(/^0+/, "");
    if (no0a && no0a !== a) push(no0a);
    if (a.length < 13 && a.length >= 8) push(a.padStart(13, "0"));
    if (a.length === 13 && a.startsWith("0")) push(a.slice(1));
  }

  return out;
}

export function suggestFamilyKey(name: string) {
  const n = normName(name);
  if (!n) return "";
  // tokens: dejamos palabras "fuertes" + números con unidad (600ml, 2l, 1.5l, etc.)
  const tokens = n
    .split(" ")
    .map((t) => t.trim())
    .filter(Boolean)
    .filter((t) => t.length > 2)
    .filter((t) => !/^(de|del|la|el|y|con|sin|para|por)$/.test(t));

  const keep: string[] = [];
  for (const t of tokens) {
    if (keep.length >= 3) break;
    // mantener tamaños comunes
    if (/^\d+(\.\d+)?(ml|l|lt|kg|g)$/.test(t)) {
      keep.push(t);
      continue;
    }
    if (/^\d+$/.test(t)) continue; // número suelto suele ser ruido
    keep.push(t);
  }

  return keep.join(" ");
}
