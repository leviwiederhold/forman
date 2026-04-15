import Link from "next/link";
import { loginAction } from "./actions";
import { Button } from "@/components/ui/button";
import { DemoQuoteLinkButton } from "@/components/demo-quote-link-button";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function first(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function LoginPage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {};
  const requestedRedirect = first(sp.redirectTo);
  const error = first(sp.error);
  const message = first(sp.message);
  const signedOut = first(sp.signed_out) === "1";

  const redirectTo = requestedRedirect ?? "/dashboard";

  return (
    <main className="mx-auto max-w-md space-y-6 p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm text-foreground/70">Welcome back</div>
          <h1 className="text-lg font-light tracking-wide">Log in</h1>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/signup">Sign up</Link>
        </Button>
      </div>

      {signedOut ? (
        <div className="rounded-xl border p-3 text-sm">
          <div className="font-medium">You’re signed out</div>
          <div className="mt-1 text-foreground/70">
            Log back in below or create a new account.
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border bg-card p-5 shadow-none">
        <div className="text-sm text-foreground/70">Welcome back</div>
        <h1 className="text-lg font-light tracking-wide">Log in</h1>

        {error || message ? (
          <div className="mt-4 rounded-xl border p-3 text-sm">
            <div className="font-medium">Login error</div>
            <div className="mt-1 text-foreground/70">
              {message ?? "Something went wrong."}
            </div>
          </div>
        ) : null}

        <form action={loginAction} className="mt-4 space-y-3">
          <input type="hidden" name="redirectTo" value={redirectTo} />

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
            Log in
          </Button>
        </form>

        <div className="mt-4 flex flex-col gap-2 text-sm text-foreground/70 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Need an account?{" "}
            <Link className="underline" href="/signup">
              Sign up
            </Link>
          </span>
          <Link className="underline" href="/">
            Back to home
          </Link>
        </div>

        <div className="mt-4 border-t border-[#dfbfbc] pt-4">
          <DemoQuoteLinkButton
            sourcePage="/login"
            label="Try a demo quote"
            variant="outline"
            className="w-full"
          />
        </div>
      </div>
    </main>
  );
}
