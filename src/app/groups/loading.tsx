export default function GroupsLoading() {
  return (
    <div className="min-h-full bg-background">
      {/* Group list skeleton */}
      <div className="px-4 pt-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="h-5 w-20 bg-muted rounded-full animate-pulse" />
          <div className="h-8 w-24 bg-muted rounded-xl animate-pulse" />
        </div>
        {/* Group cards */}
        {[1, 2, 3].map(i => (
          <div key={i} className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3 animate-pulse"
            style={{ animationDelay: `${i * 60}ms` }}>
            <div className="w-12 h-12 rounded-2xl bg-muted shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded-full w-2/5" />
              <div className="h-3 bg-muted rounded-full w-3/5" />
            </div>
            <div className="w-5 h-5 bg-muted rounded-full shrink-0" />
          </div>
        ))}
        {/* Balance card skeleton */}
        <div className="rounded-2xl border border-border bg-card p-4 mt-4 animate-pulse">
          <div className="h-4 w-24 bg-muted rounded-full mb-3" />
          <div className="flex gap-2">
            {[1, 2].map(i => <div key={i} className="flex-1 h-16 bg-muted rounded-xl" />)}
          </div>
        </div>
      </div>
    </div>
  );
}
