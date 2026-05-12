export default function Loading() {
  return (
    <div className="page-pad">
      <div className="relative h-[calc(100dvh-var(--bottom-nav-h)-110px)] min-h-[420px] w-full">
        <div className="skeleton absolute inset-0 rounded-3xl" />
      </div>
      <div className="mt-5 flex items-center justify-between">
        <div className="skeleton h-12 w-12 rounded-full" />
        <div className="skeleton h-12 w-12 rounded-full" />
        <div className="skeleton h-16 w-16 rounded-full" />
        <div className="skeleton h-12 w-12 rounded-full" />
      </div>
    </div>
  );
}
