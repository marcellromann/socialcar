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
