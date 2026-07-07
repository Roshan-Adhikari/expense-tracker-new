export default function DashboardLoading() {
  return (
    <div className="min-h-full bg-background animate-pulse">
      {/* Hero card skeleton */}
      <div className="bg-gradient-to-br from-primary/30 to-accent/20 px-4 pt-6 pb-10">
        <div className="h-4 w-40 bg-white/20 rounded-full mb-3" />
        <div className="h-12 w-48 bg-white/20 rounded-2xl mb-6" />
        <div className="flex gap-3">
          {[1,2,3].map(i => <div key={i} className="flex-1 h-16 bg-white/10 rounded-2xl" />)}
        </div>
      </div>
      {/* Quick actions */}
      <div className="px-4 -mt-5 mb-6">
        <div className="grid grid-cols-4 gap-2">
          {[1,2,3,4].map(i => <div key={i} className="h-16 bg-muted rounded-2xl" />)}
        </div>
      </div>
      {/* Categories */}
      <div className="px-4 mb-6">
        <div className="h-4 w-40 bg-muted rounded-full mb-3" />
        <div className="flex gap-3">
          {[1,2,3,4].map(i => <div key={i} className="w-20 h-24 bg-muted rounded-2xl shrink-0" />)}
        </div>
      </div>
      {/* Transactions */}
      <div className="px-4">
        <div className="h-4 w-32 bg-muted rounded-full mb-3" />
        <div className="rounded-3xl overflow-hidden border border-border bg-card divide-y divide-border">
          {[1,2,3,4].map(i => (
            <div key={i} className="flex items-center px-4 py-4 gap-3">
              <div className="w-11 h-11 bg-muted rounded-2xl shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 bg-muted rounded-full w-3/4" />
                <div className="h-3 bg-muted rounded-full w-1/2" />
              </div>
              <div className="h-4 w-16 bg-muted rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
