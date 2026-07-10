export default function ExpensesLoading() {
  return (
    <div className="min-h-full bg-background px-4 pt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="h-5 w-28 bg-muted rounded-full animate-pulse" />
        <div className="h-8 w-24 bg-muted rounded-xl animate-pulse" />
      </div>
      {/* Summary card */}
      <div className="rounded-2xl border border-border bg-card p-4 mb-4 animate-pulse flex justify-between items-center">
        <div className="space-y-2">
          <div className="h-3 w-20 bg-muted rounded-full" />
          <div className="h-7 w-28 bg-muted rounded-lg" />
        </div>
        <div className="w-12 h-12 bg-muted rounded-2xl" />
      </div>
      {/* Filter chips */}
      <div className="flex gap-2 mb-4">
        {[80, 64, 96, 72, 60].map((w, i) => (
          <div key={i} className="h-8 bg-muted rounded-full animate-pulse shrink-0" style={{ width: w, animationDelay: `${i * 40}ms` }} />
        ))}
      </div>
      {/* Expense rows */}
      <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="flex items-center px-4 py-3.5 gap-3 animate-pulse"
            style={{ animationDelay: `${i * 45}ms` }}>
            <div className="w-10 h-10 bg-muted rounded-2xl shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 bg-muted rounded-full w-3/5" />
              <div className="h-3 bg-muted rounded-full w-2/5" />
            </div>
            <div className="h-4 w-16 bg-muted rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
