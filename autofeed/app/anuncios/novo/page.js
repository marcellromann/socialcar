import ListingForm from '@/components/ListingForm';

export const metadata = {
  title: 'Anunciar carro · Autofeed',
};

export default function NewListingPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold text-white">Anunciar carro</h1>
      <p className="mt-1 text-sm text-slate-400">
        Preencha as informações do veículo. Você pode enviar até 8 fotos.
      </p>

      <div className="card mt-6 p-6 sm:p-8">
        <ListingForm />
      </div>
    </div>
  );
}
