import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DemoQuoteLinkButton } from "@/components/demo-quote-link-button";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function first(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function SignupPage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {};
  const error = first(sp.error);
  const message = first(sp.message);

  return (
    <main className="mx-auto max-w-md space-y-6 p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm text-foreground/70">Create account</div>
          <h1 className="text-lg font-light tracking-wide">Sign up</h1>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/login?redirectTo=%2Fdashboard">Log in</Link>
        </Button>
      </div>

      <div className="rounded-2xl border bg-card p-5 shadow-none">
        {error || message ? (
          <div className="rounded-xl border p-3 text-sm">
            <div className="font-medium">Signup error</div>
            <div className="mt-1 text-foreground/70">
              {message ?? "Something went wrong."}
            </div>
          </div>
        ) : null}

        <form action="/api/auth/signup" method="post" className="space-y-3">
          <input
            name="email"
            type="email"
            placeholder="Email"
            required
            className="w-full rounded-xl border bg-white px-3 py-2 text-base md:text-sm"
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            required
            className="w-full rounded-xl border bg-white px-3 py-2 text-base md:text-sm"
          />

          <Button type="submit" className="w-full">
            Create account
          </Button>
        </form>

        <div className="mt-4 flex flex-col gap-2 text-sm text-foreground/70 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Already have an account?{" "}
            <Link className="underline" href="/login?redirectTo=%2Fdashboard">
              Log in
            </Link>
          </span>
          <Link className="underline" href="/">
            Back to home
          </Link>
        </div>

        <div className="mt-4 border-t border-[#dfbfbc] pt-4">
          <DemoQuoteLinkButton
            sourcePage="/signup"
            label="Try a demo quote"
            variant="outline"
            className="w-full"
          />
        </div>
      </div>
    </main>
  );
}
