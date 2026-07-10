export default function FriendsLoading() {
  return (
    <div className="min-h-full bg-background px-4 pt-4">
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div className="h-5 w-20 bg-muted rounded-full animate-pulse" />
        <div className="h-8 w-28 bg-muted rounded-xl animate-pulse" />
      </div>
      {/* Summary card */}
      <div className="rounded-2xl border border-border bg-card p-4 mb-4 flex items-center justify-between animate-pulse">
        <div className="space-y-2">
          <div className="h-3 w-20 bg-muted rounded-full" />
          <div className="h-6 w-10 bg-muted rounded-lg" />
        </div>
        <div className="flex -space-x-2">
          {[1,2,3].map(i => <div key={i} className="w-9 h-9 rounded-full bg-muted border-2 border-card" />)}
        </div>
      </div>
      {/* Friend rows */}
      <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex items-center px-4 py-3.5 gap-3 animate-pulse"
            style={{ animationDelay: `${i * 50}ms` }}>
            <div className="w-10 h-10 rounded-full bg-muted shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 bg-muted rounded-full w-2/5" />
              <div className="h-3 bg-muted rounded-full w-3/5" />
            </div>
            <div className="h-7 w-16 bg-muted rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
