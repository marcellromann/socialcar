'use client';

import ListingForm from '@/components/ListingForm';
import RequireAuth from '@/components/RequireAuth';
import TopBar from '@/components/TopBar';

export default function AnunciarPage() {
  return (
    <RequireAuth>
      <TopBar title="Anunciar" back />
      <div className="page-pad space-y-4">
        <p className="text-sm text-slate-400">
          Comece pela placa do veículo. Vamos buscar marca, modelo e ano automaticamente via FIPE.
        </p>
        <ListingForm />
      </div>
    </RequireAuth>
  );
}
