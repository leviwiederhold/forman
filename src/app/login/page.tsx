import Link from "next/link";
import { loginAction } from "./actions";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function first(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function LoginPage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {};
  const redirectTo = first(sp.redirectTo) ?? "/dashboard";
  const error = first(sp.error);
  const message = first(sp.message);

  return (
    <main className="mx-auto max-w-md space-y-6 p-6">
      <div>
        <div className="text-sm text-foreground/70">Welcome back</div>
        <h1 className="text-lg font-light tracking-wide">Log in</h1>
      </div>

      {error || message ? (
        <div className="rounded-xl border p-3 text-sm">
          <div className="font-medium">Login error</div>
          <div className="mt-1 text-foreground/70">
            {message ?? "Something went wrong."}
          </div>
        </div>
      ) : null}

      <form action={loginAction} className="space-y-3">
        <input type="hidden" name="redirectTo" value={redirectTo} />

        <input
          name="email"
          type="email"
          placeholder="Email"
          required
          className="w-full rounded-xl border bg-transparent px-3 py-2 text-sm"
        />

        <input
          name="password"
          type="password"
          placeholder="Password"
          required
          className="w-full rounded-xl border bg-transparent px-3 py-2 text-sm"
        />

        <Button type="submit" className="w-full">
          Log in
        </Button>
      </form>

      <div className="text-sm text-foreground/70">
        Need an account?{" "}
        <Link className="underline" href="/signup">
          Sign up
        </Link>
      </div>
    </main>
  );
}
