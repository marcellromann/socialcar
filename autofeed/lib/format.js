export function formatPrice(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return '—';
  return n.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });
}

export function formatKm(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return '—';
  return `${n.toLocaleString('pt-BR')} km`;
}

export function formatDate(value) {
  try {
    return new Date(value).toLocaleDateString('pt-BR');
  } catch {
    return '';
  }
}

// Simulação simples de financiamento (60x, sem juros — apenas referência visual)
export function simulatePayment(price, months = 60) {
  const n = Number(price);
  if (!n) return null;
  const entrada = n * 0.2;
  const restante = n - entrada;
  // taxa mensal mock 1.49%
  const taxa = 0.0149;
  const parcela = (restante * taxa) / (1 - Math.pow(1 + taxa, -months));
  return {
    entrada,
    parcela,
    months,
  };
}

export const FAIXAS_PRECO = [
  { id: 'ate_50k', label: 'até R$ 50 mil' },
  { id: '50k_100k', label: 'R$ 50–100 mil' },
  { id: '100k_150k', label: 'R$ 100–150 mil' },
  { id: '150k_200k', label: 'R$ 150–200 mil' },
  { id: 'acima_200k', label: 'acima de R$ 200 mil' },
];

export const CATEGORIAS = [
  { id: 'hatch', label: 'Hatch' },
  { id: 'sedan', label: 'Sedã' },
  { id: 'suv', label: 'SUV' },
  { id: 'caminhonete', label: 'Caminhonete' },
  { id: 'eletrico', label: 'Elétrico' },
  { id: 'moto', label: 'Moto' },
];

export const COMBUSTIVEIS_PERFIL = [
  { id: 'flex', label: 'Flex' },
  { id: 'diesel', label: 'Diesel' },
  { id: 'eletrico', label: 'Elétrico' },
  { id: 'hibrido', label: 'Híbrido' },
  { id: 'tanto_faz', label: 'Tanto faz' },
];

export const FINANCIAMENTO = [
  { id: 'sim', label: 'Sim, vou financiar' },
  { id: 'a_vista', label: 'À vista' },
  { id: 'nao_sei', label: 'Ainda não sei' },
];

export const ESTADOS_BR = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
];

export function summarizeBuyer(profile) {
  if (!profile) return null;
  const parts = [];
  if (profile.tem_carro) parts.push('tem carro atual');
  if (profile.categorias_buscadas?.length) {
    const labels = profile.categorias_buscadas
      .map((c) => CATEGORIAS.find((x) => x.id === c)?.label || c)
      .join(', ');
    parts.push(`busca ${labels}`);
  }
  if (profile.faixa_preco) {
    const f = FAIXAS_PRECO.find((x) => x.id === profile.faixa_preco);
    if (f) parts.push(`faixa ${f.label}`);
  }
  if (profile.pretende_financiar === 'sim') parts.push('pretende financiar');
  if (profile.pretende_financiar === 'a_vista') parts.push('compra à vista');
  return parts.join(' · ');
}
