export default function FriendsLoading() {
  return (
    <div className="min-h-full bg-background animate-pulse px-4 pt-4 space-y-4">
      <div className="rounded-3xl bg-muted p-4 flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-3 w-24 bg-muted-foreground/20 rounded-full" />
          <div className="h-8 w-12 bg-muted-foreground/20 rounded-xl" />
        </div>
        <div className="flex -space-x-2">
          {[1,2,3].map(i => <div key={i} className="w-10 h-10 rounded-full bg-muted-foreground/20 border-2 border-card" />)}
        </div>
      </div>
      <div className="h-11 w-full bg-muted rounded-2xl" />
      <div className="rounded-3xl overflow-hidden border border-border bg-card divide-y divide-border">
        {[1,2,3,4].map(i => (
          <div key={i} className="flex items-center px-4 py-4 gap-3">
            <div className="w-11 h-11 rounded-full bg-muted shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 bg-muted rounded-full w-1/2" />
              <div className="h-3 bg-muted rounded-full w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
