// Critérios de verificação automática de um anúncio (sem API externa).
// Cada critério recebe os dados disponíveis e retorna { passed, label, hint? }.
// Reutilizado em ListingForm (submit) e em /meus-anuncios (exibição).

import { isValidPlate } from './plate';

export const PRECO_MIN = 1000;
export const PRECO_MAX = 50000000;
export const MIN_PHOTOS = 3;
export const DESCRICAO_MIN = 50;

const CAMPOS_OBRIGATORIOS = [
  ['marca', 'Marca'],
  ['modelo', 'Modelo'],
  ['ano', 'Ano'],
  ['km', 'Quilometragem'],
  ['combustivel', 'Combustível'],
  ['cambio', 'Câmbio'],
  ['cor', 'Cor'],
  ['cidade', 'Cidade'],
  ['estado', 'Estado'],
];

function notEmpty(v) {
  if (v == null) return false;
  if (typeof v === 'string') return v.trim().length > 0;
  return true;
}

// `ctx` carrega informações que não vivem na linha listings:
//   - placa: texto da placa (apenas no submit). Se ausente, assume placa OK quando o anúncio já está salvo.
//   - placaUnica: boolean, default true (já validado no fluxo de submit).
//   - fotosCount: total de fotos do anúncio.
//   - temFotoPrincipal: bool.
export function computeVerification(listing = {}, ctx = {}) {
  const {
    placa,
    placaUnica = true,
    fotosCount = 0,
    temFotoPrincipal = !!listing.foto_principal_url,
  } = ctx;

  const checks = [];

  checks.push({
    id: 'placa_formato',
    label: 'Placa em formato válido',
    passed: placa != null ? isValidPlate(placa) : true,
  });

  checks.push({
    id: 'placa_unica',
    label: 'Placa única no SocialCar',
    passed: !!placaUnica,
  });

  checks.push({
    id: 'fotos_minimas',
    label: `Pelo menos ${MIN_PHOTOS} fotos`,
    passed: fotosCount >= MIN_PHOTOS,
  });

  checks.push({
    id: 'foto_principal',
    label: 'Foto principal selecionada',
    passed: !!temFotoPrincipal,
  });

  const desc = String(listing.descricao || '').trim();
  checks.push({
    id: 'descricao',
    label: `Descrição com ${DESCRICAO_MIN}+ caracteres`,
    passed: desc.length >= DESCRICAO_MIN,
  });

  const preco = Number(listing.preco);
  checks.push({
    id: 'preco',
    label: 'Preço entre R$ 1.000 e R$ 50.000.000',
    passed: Number.isFinite(preco) && preco >= PRECO_MIN && preco <= PRECO_MAX,
  });

  const camposFaltando = CAMPOS_OBRIGATORIOS.filter(([key]) => !notEmpty(listing[key]));
  checks.push({
    id: 'campos_obrigatorios',
    label: 'Todos os campos obrigatórios preenchidos',
    passed: camposFaltando.length === 0,
    hint: camposFaltando.length
      ? `Faltam: ${camposFaltando.map(([, lbl]) => lbl).join(', ')}`
      : null,
  });

  const passed = checks.every((c) => c.passed);
  return { passed, checks };
}
