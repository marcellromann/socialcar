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

/**
 * Tenta identificar o veículo a partir da placa via BrasilAPI /vehicles.
 * Não há API pública gratuita confiável para lookup por placa no Brasil — esta
 * tentativa é best-effort e na maioria dos casos retorna null, levando o
 * formulário ao fluxo manual.
 *
 * @param {string} placa  Placa normalizada (sem hífen).
 * @param {{ timeoutMs?: number }} [opts]
 * @returns {Promise<{marca,modelo,ano,versao,combustivel?,valorFipe?:number} | null>}
 */
export async function lookupPlate(placa, { timeoutMs = 5000 } = {}) {
  if (!placa) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(
      `${BRASILAPI}/vehicles/v1/${encodeURIComponent(placa)}`,
      { cache: 'no-store', signal: ctrl.signal }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || (!data.marca && !data.modelo)) return null;
    return {
      marca: data.marca || '',
      modelo: data.modelo || '',
      ano: data.anoModelo || data.ano || data.anoFabricacao || '',
      versao: data.versao || '',
      combustivel: data.combustivel || data.tipoCombustivel || '',
      valorFipe: data.valor ?? data.fipe?.valor ?? null,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Quebra um nome de modelo FIPE ("POLO MPI 1.0 Flex 12V 5p") em peças:
 * { nomePrincipal: "POLO", motorizacao: "1.0 Flex", versao: "MPI 12V 5p" }.
 * Heurística — usuário pode ajustar.
 */
export function parseFipeModelName(fullName) {
  if (!fullName) return { nomePrincipal: '', motorizacao: '', versao: '' };
  const tokens = String(fullName).trim().split(/\s+/);
  const nomePrincipal = tokens[0] || '';
  const engineIdx = tokens.findIndex((t) => /^\d+(?:\.\d+)?$/.test(t));
  if (engineIdx === -1) {
    return {
      nomePrincipal,
      motorizacao: '',
      versao: tokens.slice(1).join(' '),
    };
  }
  const enginePieces = [tokens[engineIdx]];
  const next = tokens[engineIdx + 1];
  if (next && /^[A-Za-z]+$/.test(next)) enginePieces.push(next);
  const motorizacao = enginePieces.join(' ');
  const before = tokens.slice(1, engineIdx);
  const after = tokens.slice(engineIdx + enginePieces.length);
  const versao = [...before, ...after].join(' ').trim();
  return { nomePrincipal, motorizacao, versao };
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
