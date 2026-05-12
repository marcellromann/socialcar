export default function Loading() {
  return (
    <div className="page-pad space-y-4">
      <div className="card flex items-center gap-4 p-4">
        <div className="skeleton h-16 w-16 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-4 w-1/2" />
          <div className="skeleton h-3 w-3/4" />
          <div className="skeleton h-3 w-1/3" />
        </div>
      </div>
      <div className="card p-4 space-y-3">
        <div className="skeleton h-4 w-1/3" />
        <div className="skeleton h-10 w-full" />
        <div className="skeleton h-10 w-full" />
        <div className="skeleton h-10 w-full" />
        <div className="skeleton h-11 w-full" />
      </div>
      <div className="card p-4 space-y-3">
        <div className="skeleton h-4 w-2/5" />
        <div className="skeleton h-3 w-3/4" />
      </div>
    </div>
  );
}
