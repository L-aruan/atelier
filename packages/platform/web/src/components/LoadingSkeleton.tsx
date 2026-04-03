export function ToolCardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-gray-200 bg-white p-5">
      <div className="mx-auto mb-3 h-10 w-10 rounded-lg bg-gray-200" />
      <div className="mx-auto h-4 w-[75%] rounded bg-gray-200" />
      <div className="mx-auto mt-2 h-3 w-full rounded bg-gray-100" />
      <div className="mx-auto mt-2 h-3 w-[85%] rounded bg-gray-100" />
      <div className="mx-auto mt-4 h-5 w-16 rounded-full bg-gray-100" />
    </div>
  );
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <ul className="space-y-3" aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <li
          key={i}
          className="animate-pulse flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-5 w-40 rounded bg-gray-200" />
            <div className="h-4 w-full max-w-md rounded bg-gray-100" />
            <div className="h-3 w-24 rounded bg-gray-100" />
          </div>
          <div className="flex gap-2">
            <div className="h-8 w-16 rounded-lg bg-gray-100" />
            <div className="h-8 w-16 rounded-lg bg-gray-100" />
          </div>
        </li>
      ))}
    </ul>
  );
}
