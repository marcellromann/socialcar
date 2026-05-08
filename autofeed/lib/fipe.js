// Integração com a BrasilAPI:
//   - Tabelas FIPE:  https://brasilapi.com.br/api/fipe/tabela/v1
//   - Marcas:        https://brasilapi.com.br/api/fipe/marcas/v1/carros
//   - Preço por código FIPE: https://brasilapi.com.br/api/fipe/preco/v1/{codigoFipe}
//   - Consulta por placa (quando disponível): https://brasilapi.com.br/api/vehicles/v1/{placa}
//
// Quando a consulta por placa não existir/retornar 404, o formulário
// permite preencher manualmente — todos os campos seguem editáveis.

const BASE = 'https://brasilapi.com.br/api';

async function fetchJson(url, init = {}) {
  const res = await fetch(url, { ...init, cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/**
 * Tenta consultar dados do veículo a partir da placa.
 * @returns {Promise<{marca,modelo,ano,versao,valorFipe?:number} | null>}
 */
export async function lookupPlate(placa) {
  if (!placa) return null;

  // 1. Endpoint vehicles (quando disponível na BrasilAPI)
  try {
    const data = await fetchJson(`${BASE}/vehicles/v1/${encodeURIComponent(placa)}`);
    if (data && (data.marca || data.modelo)) {
      return {
        marca: data.marca || '',
        modelo: data.modelo || '',
        ano: data.anoModelo || data.ano || data.anoFabricacao || '',
        versao: data.versao || data.modelo || '',
        valorFipe: data.valor || data.fipe?.valor || null,
      };
    }
  } catch (_) {
    // segue para fallback FIPE
  }

  // Sem dados — formulário deixa o usuário preencher manualmente.
  return null;
}

/** Lista de marcas de carros na FIPE. */
export async function fetchFipeBrands() {
  try {
    return await fetchJson(`${BASE}/fipe/marcas/v1/carros`);
  } catch {
    return [];
  }
}

/** Lista de tabelas FIPE de referência. */
export async function fetchFipeTables() {
  try {
    return await fetchJson(`${BASE}/fipe/tabela/v1`);
  } catch {
    return [];
  }
}

/** Preço FIPE por código (ex.: 001310-9). */
export async function fetchFipePrice(codigoFipe) {
  if (!codigoFipe) return [];
  try {
    return await fetchJson(`${BASE}/fipe/preco/v1/${encodeURIComponent(codigoFipe)}`);
  } catch {
    return [];
  }
}
