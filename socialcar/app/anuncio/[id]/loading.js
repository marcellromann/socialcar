export default function Loading() {
  return (
    <div className="page-pad space-y-5">
      <div className="skeleton aspect-[4/3] w-full rounded-2xl" />
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="skeleton h-6 w-16 rounded-full" />
          <div className="skeleton h-6 w-20 rounded-full" />
        </div>
        <div className="skeleton h-8 w-3/4" />
        <div className="skeleton h-4 w-1/2" />
      </div>
      <div className="card p-4 space-y-3">
        <div className="skeleton h-3 w-1/4" />
        <div className="skeleton h-10 w-1/2" />
        <div className="skeleton h-3 w-2/3" />
      </div>
      <div className="card p-4 space-y-3">
        <div className="skeleton h-4 w-1/3" />
        <div className="grid grid-cols-2 gap-3">
          <div className="skeleton h-10" />
          <div className="skeleton h-10" />
          <div className="skeleton h-10" />
          <div className="skeleton h-10" />
        </div>
      </div>
      <div className="space-y-3">
        <div className="skeleton h-12 w-full rounded-full" />
        <div className="skeleton h-12 w-full rounded-full" />
      </div>
    </div>
  );
}
