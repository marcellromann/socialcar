// Validação e normalização de placas brasileiras (Mercosul ABC1D23 e antiga ABC1234)

const PLATE_OLD = /^[A-Z]{3}[0-9]{4}$/;
const PLATE_MERCOSUL = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/;

export function normalizePlate(raw) {
  return String(raw || '')
    .toUpperCase()
    .replace(/[\s-]/g, '')
    .replace(/[^A-Z0-9]/g, '');
}

export function isValidPlate(raw) {
  const p = normalizePlate(raw);
  return PLATE_OLD.test(p) || PLATE_MERCOSUL.test(p);
}

export function maskPlate(raw) {
  const p = normalizePlate(raw);
  if (p.length <= 3) return p;
  return `${p.slice(0, 3)}-${p.slice(3, 7)}`;
}

// SHA-256 da placa normalizada — usado como identificador único sem expor o texto
export async function hashPlate(raw) {
  const p = normalizePlate(raw);
  if (!p) return null;
  const data = new TextEncoder().encode(`socialcar:${p}`);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
