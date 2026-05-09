// Integração FIPE em cascata: marca → modelo → ano → preço.
//
// A BrasilAPI expõe apenas /fipe/marcas, /fipe/tabela e /fipe/preco/{codigoFipe}.
// Para a cascata completa usamos a API pública do Parallelum (mesma base FIPE),
// que oferece modelos e anos por marca:
//   - https://parallelum.com.br/fipe/api/v1/carros/marcas
//   - https://parallelum.com.br/fipe/api/v1/carros/marcas/{marcaId}/modelos
//   - https://parallelum.com.br/fipe/api/v1/carros/marcas/{marcaId}/modelos/{modeloId}/anos
//   - https://parallelum.com.br/fipe/api/v1/carros/marcas/{marcaId}/modelos/{modeloId}/anos/{anoId}

const PARALLELUM = 'https://parallelum.com.br/fipe/api/v1/carros';
const BRASILAPI = 'https://brasilapi.com.br/api';

async function fetchJson(url, init = {}) {
  const res = await fetch(url, { ...init, cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** Lista de marcas de carros. Retorna [{ codigo, nome }]. */
export async function fetchFipeBrands() {
  try {
    const data = await fetchJson(`${PARALLELUM}/marcas`);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/** Lista de modelos de uma marca. Retorna [{ codigo, nome }]. */
export async function fetchFipeModels(marcaId) {
  if (!marcaId) return [];
  try {
    const data = await fetchJson(`${PARALLELUM}/marcas/${encodeURIComponent(marcaId)}/modelos`);
    return Array.isArray(data?.modelos) ? data.modelos : [];
  } catch {
    return [];
  }
}

/** Lista de anos disponíveis para um modelo. Retorna [{ codigo, nome }]. */
export async function fetchFipeYears(marcaId, modeloId) {
  if (!marcaId || !modeloId) return [];
  try {
    const data = await fetchJson(
      `${PARALLELUM}/marcas/${encodeURIComponent(marcaId)}/modelos/${encodeURIComponent(modeloId)}/anos`
    );
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/**
 * Detalhe completo (preço, combustível, código FIPE etc.) para a combinação
 * marca/modelo/ano selecionada.
 */
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

/** Converte "R$ 87.400,00" → 87400 (number). */
export function parseFipeValor(valor) {
  if (!valor) return null;
  const digits = String(valor).replace(/[^\d,]/g, '').replace(',', '.');
  const n = Number(digits);
  return Number.isFinite(n) ? n : null;
}

/** Mapeia o "TipoCombustivel" da FIPE para os enums aceitos pelo schema. */
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

/** Preço FIPE por código (ex.: 001310-9). Mantido para compatibilidade. */
export async function fetchFipePrice(codigoFipe) {
  if (!codigoFipe) return [];
  try {
    return await fetchJson(`${BRASILAPI}/fipe/preco/v1/${encodeURIComponent(codigoFipe)}`);
  } catch {
    return [];
  }
}
