import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-3xl space-y-4">
        <h1 className="text-base font-light tracking-wide">Forman</h1>

        <p className="text-sm text-foreground/70">
          Step 1 check: dark theme + Quicksand Light (300) + shadcn works.
        </p>

        <div className="flex flex-wrap gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
        </div>

        <div className="rounded-2xl border bg-card p-4 text-sm text-card-foreground">
          <div className="flex items-center justify-between">
            <span className="text-foreground/80">Next up</span>
            <span className="text-foreground/60">Roofing v1</span>
          </div>
          <div className="mt-2 text-foreground/70">
            Auth → Dashboard → Settings (Roofing Rate Card) → New Quote.
          </div>
        </div>
      </div>
    </main>
  );
}
