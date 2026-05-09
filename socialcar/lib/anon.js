// Apelido anônimo, consistente, derivado do user_id (hash determinístico).
// Mesmo comprador = mesmo apelido para qualquer vendedor.

export function buyerAlias(userId) {
  if (!userId) return 'Comprador';
  let h = 5381;
  const s = String(userId);
  for (let i = 0; i < s.length; i++) {
    h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  }
  const num = h % 9999;
  return `Comprador #${String(num).padStart(4, '0')}`;
}

const FAIXA_RANGE = {
  ate_50k:    [0, 50_000],
  '50k_100k': [50_000, 100_000],
  '100k_150k':[100_000, 150_000],
  '150k_200k':[150_000, 200_000],
  acima_200k: [200_000, Infinity],
};

// Score 0-100 entre o anúncio e o perfil do comprador.
// Critérios considerados quando o comprador definiu uma preferência: preço, combustível e estado.
// "tanto_faz" no combustível conta como neutro (ignorado no denominador).
export function computeMatch(listing, profile) {
  if (!profile || !listing) return null;
  let total = 0;
  let matches = 0;

  if (profile.faixa_preco) {
    total++;
    const [min, max] = FAIXA_RANGE[profile.faixa_preco] || [0, Infinity];
    const price = Number(listing.preco) || 0;
    if (price >= min && price < max) matches++;
  }

  if (profile.combustivel && profile.combustivel !== 'tanto_faz') {
    total++;
    if (listing.combustivel && listing.combustivel === profile.combustivel) matches++;
  }

  if (profile.estado) {
    total++;
    if (listing.estado && listing.estado === profile.estado) matches++;
  }

  if (total === 0) return 100;
  return Math.round((matches / total) * 100);
}
