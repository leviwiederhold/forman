import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signIn } from "./actions";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; message?: string };
}) {
  const error =
    searchParams?.error === "auth"
      ? "Invalid email or password."
      : searchParams?.error === "invalid"
      ? "Enter a valid email + password."
      : null;

  const message =
    searchParams?.message === "check-email"
      ? "Check your email to confirm your account, then log in."
      : null;

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-sm space-y-6">
        <div className="space-y-1">
          <h1 className="text-base font-light tracking-wide">Log in</h1>
          <p className="text-sm text-foreground/70">Forman Roofing v1</p>
        </div>

        {error ? (
          <div className="rounded-xl border bg-card p-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {message ? (
          <div className="rounded-xl border bg-card p-3 text-sm text-foreground/80">
            {message}
          </div>
        ) : null}

        <form action={signIn} className="space-y-3">
          <Input name="email" type="email" placeholder="Email" required />
          <Input
            name="password"
            type="password"
            placeholder="Password"
            required
          />
          <Button type="submit" className="w-full">
            Log in
          </Button>
        </form>

        <p className="text-sm text-foreground/70">
          No account?{" "}
          <Link className="text-foreground underline underline-offset-4" href="/signup">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
