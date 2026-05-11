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
  { id: '200k_300k', label: 'R$ 200–300 mil' },
  { id: '300k_500k', label: 'R$ 300–500 mil' },
  { id: 'acima_500k', label: 'acima de R$ 500 mil' },
];

export const CATEGORIAS = [
  { id: 'hatch', label: 'Hatch' },
  { id: 'sedan', label: 'Sedã' },
  { id: 'suv', label: 'SUV' },
  { id: 'caminhonete', label: 'Caminhonete' },
  { id: 'coupe', label: 'Coupé' },
  { id: 'eletrico', label: 'Elétrico' },
  { id: 'moto', label: 'Moto' },
];

export const COMBUSTIVEIS_PERFIL = [
  { id: 'gasolina', label: 'Gasolina' },
  { id: 'etanol', label: 'Etanol' },
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

  if (profile.tem_carro && profile.carro_atual) {
    const { marca, modelo, ano } = profile.carro_atual;
    const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
    const carroStr = [capitalize(marca), modelo?.toUpperCase(), ano].filter(Boolean).join(' ');
    parts.push(`Carro atual: ${carroStr}`);
  }

  if (profile.categorias_buscadas?.length) {
    const labels = profile.categorias_buscadas
      .map((c) => CATEGORIAS.find((x) => x.id === c)?.label || c)
      .join(', ');
    parts.push(`Busca: ${labels}`);
  }

  if (profile.faixa_preco) {
    const f = FAIXAS_PRECO.find((x) => x.id === profile.faixa_preco);
    if (f) parts.push(`Faixa: ${f.label}`);
  }

  if (profile.combustivel?.length) {
    const labels = profile.combustivel
      .map((c) => COMBUSTIVEIS_PERFIL.find((x) => x.id === c)?.label || c)
      .join(', ');
    parts.push(`Combustível: ${labels}`);
  }

  if (profile.pretende_financiar) {
    const map = {
      sim: 'Pretende financiar',
      a_vista: 'Compra à vista',
      nao_sei: 'Ainda decidindo financiamento',
    };
    if (map[profile.pretende_financiar]) parts.push(map[profile.pretende_financiar]);
  }

  if (profile.estado) parts.push(profile.estado);

  return parts.join(' · ');
}
