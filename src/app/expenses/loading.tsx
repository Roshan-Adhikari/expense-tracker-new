export default function ExpensesLoading() {
  return (
    <div className="min-h-full bg-background animate-pulse px-4 pt-4 space-y-4">
      <div className="rounded-3xl bg-muted p-4 flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-3 w-24 bg-muted-foreground/20 rounded-full" />
          <div className="h-8 w-32 bg-muted-foreground/20 rounded-xl" />
        </div>
        <div className="w-14 h-14 rounded-2xl bg-muted-foreground/20" />
      </div>
      <div className="h-11 w-full bg-muted rounded-2xl" />
      <div className="flex gap-2">
        {[1,2,3,4,5].map(i => <div key={i} className="h-8 w-20 bg-muted rounded-full shrink-0" />)}
      </div>
      <div className="rounded-3xl overflow-hidden border border-border bg-card divide-y divide-border">
        {[1,2,3,4,5].map(i => (
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
  );
}
