export default function Loading() {
  return (
    <div className="page-pad">
      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card overflow-hidden p-0">
            <div className="skeleton aspect-[4/3] w-full" />
            <div className="space-y-2 p-3">
              <div className="skeleton h-3 w-3/4" />
              <div className="skeleton h-4 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
