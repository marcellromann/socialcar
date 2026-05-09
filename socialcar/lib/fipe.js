// Cascade FIPE marca → modelo → ano → preço via API pública do Parallelum.
//
//   - https://parallelum.com.br/fipe/api/v1/carros/marcas
//   - https://parallelum.com.br/fipe/api/v1/carros/marcas/{marca}/modelos
//   - https://parallelum.com.br/fipe/api/v1/carros/marcas/{marca}/modelos/{modelo}/anos
//   - https://parallelum.com.br/fipe/api/v1/carros/marcas/{marca}/modelos/{modelo}/anos/{ano}
//
// Cada chamada tem timeout de 4s via AbortController. Funções *lançam* em caso
// de falha (timeout ou HTTP erro) — o componente decide se mostra fallback de
// texto livre.

const PARALLELUM = 'https://parallelum.com.br/fipe/api/v1/carros';
const DEFAULT_TIMEOUT_MS = 4000;

async function fetchJson(url, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { cache: 'no-store', signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/** Lista de marcas. Lança em caso de falha. */
export async function fetchFipeBrands() {
  const data = await fetchJson(`${PARALLELUM}/marcas`);
  return Array.isArray(data) ? data : [];
}

/** Modelos de uma marca. Lança em caso de falha. */
export async function fetchFipeModels(marcaId) {
  if (!marcaId) return [];
  const data = await fetchJson(`${PARALLELUM}/marcas/${encodeURIComponent(marcaId)}/modelos`);
  return Array.isArray(data?.modelos) ? data.modelos : [];
}

/** Anos de um modelo. Lança em caso de falha. */
export async function fetchFipeYears(marcaId, modeloId) {
  if (!marcaId || !modeloId) return [];
  const data = await fetchJson(
    `${PARALLELUM}/marcas/${encodeURIComponent(marcaId)}/modelos/${encodeURIComponent(modeloId)}/anos`
  );
  return Array.isArray(data) ? data : [];
}

/** Detalhe completo (preço, combustível). Retorna null se falhar — não bloqueia avanço. */
export async function fetchFipeDetail(marcaId, modeloId, anoId) {
  if (!marcaId || !modeloId || !anoId) return null;
  try {
    return await fetchJson(
      `${PARALLELUM}/marcas/${encodeURIComponent(marcaId)}/modelos/${encodeURIComponent(modeloId)}/anos/${encodeURIComponent(anoId)}`
    );
  } catch {
    return null;
  }
}

/** "R$ 87.400,00" → 87400. */
export function parseFipeValor(valor) {
  if (!valor) return null;
  const digits = String(valor).replace(/[^\d,]/g, '').replace(',', '.');
  const n = Number(digits);
  return Number.isFinite(n) ? n : null;
}

/** Mapeia rótulo FIPE para enum aceito pelo schema. */
export function mapFipeFuel(label) {
  if (!label) return '';
  const l = String(label).toLowerCase();
  if (l.includes('flex') || l.includes('álcool/gasolina') || l.includes('alcool/gasolina')) return 'flex';
  if (l.includes('gasolina')) return 'gasolina';
  if (l.includes('álcool') || l.includes('alcool') || l.includes('etanol')) return 'etanol';
  if (l.includes('diesel')) return 'diesel';
  if (l.includes('elétr') || l.includes('eletr')) return 'eletrico';
  if (l.includes('híbr') || l.includes('hibr')) return 'hibrido';
  return '';
}
