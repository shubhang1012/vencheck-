import { Sparkles } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border bg-background/50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Sparkles className="h-4 w-4 text-indigo-500" />
        <span>
          &copy; {new Date().getFullYear()} Vencheck. All rights reserved.
        </span>
      </div>
    </footer>
  );
}
