export default function GroupsLoading() {
  return (
    <div className="min-h-full bg-background animate-pulse px-4 pt-4 space-y-4">
      <div className="rounded-3xl bg-muted p-4 flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-3 w-28 bg-muted-foreground/20 rounded-full" />
          <div className="h-8 w-12 bg-muted-foreground/20 rounded-xl" />
        </div>
        <div className="w-14 h-14 rounded-2xl bg-muted-foreground/20" />
      </div>
      <div className="rounded-3xl overflow-hidden border border-border bg-card divide-y divide-border">
        {[1,2,3].map(i => (
          <div key={i} className="flex items-center px-4 py-4 gap-3">
            <div className="w-12 h-12 rounded-2xl bg-muted shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 bg-muted rounded-full w-2/3" />
              <div className="h-3 bg-muted rounded-full w-1/2" />
            </div>
            <div className="h-4 w-16 bg-muted rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
