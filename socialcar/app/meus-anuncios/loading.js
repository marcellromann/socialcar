export default function Loading() {
  return (
    <div className="page-pad space-y-3">
      <div className="skeleton h-12 w-full" />
      <ul className="space-y-3">
        {[0, 1, 2].map((i) => (
          <li key={i} className="card p-3">
            <div className="flex gap-3">
              <div className="skeleton h-16 w-20 rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-4 w-2/3" />
                <div className="skeleton h-3 w-1/2" />
                <div className="skeleton h-5 w-1/3" />
              </div>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2 border-t border-outline pt-3">
              <div className="skeleton h-8" />
              <div className="skeleton h-8" />
              <div className="skeleton h-8" />
              <div className="skeleton h-8" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
