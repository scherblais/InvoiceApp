import { Construction } from "lucide-react";

export function PlaceholderView({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-6 py-5">
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
      </div>
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 text-center max-w-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border bg-muted/40 text-muted-foreground">
            <Construction className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium">Coming up next</p>
            <p className="text-sm text-muted-foreground">
              {description ??
                "This view hasn't been ported yet. We're rebuilding the app view-by-view."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
