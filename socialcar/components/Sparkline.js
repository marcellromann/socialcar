'use client';

// Mini gráfico de barras dos últimos N dias.
// data: array de números (mais antigo → mais recente).
export default function Sparkline({ data = [], height = 36 }) {
  const max = Math.max(1, ...data);
  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.map((v, i) => {
        const h = Math.round((v / max) * (height - 4));
        return (
          <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1">
            <div
              className={`w-full rounded-sm ${v > 0 ? 'bg-brand-500' : 'bg-elevated'}`}
              style={{ height: Math.max(2, h) }}
              title={`${v}`}
            />
          </div>
        );
      })}
    </div>
  );
}

// Recebe lista de timestamps ISO e devolve array com o número de eventos dos últimos N dias
// (índice 0 = N-1 dias atrás, último índice = hoje).
export function bucketByDay(timestamps, days = 7) {
  const buckets = new Array(days).fill(0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  for (const ts of timestamps) {
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    const diff = Math.round((now - d) / 86_400_000);
    if (diff >= 0 && diff < days) {
      buckets[days - 1 - diff]++;
    }
  }
  return buckets;
}
