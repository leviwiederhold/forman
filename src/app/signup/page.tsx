import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SignupPageProps = {
  searchParams?: {
    error?: string;
  };
};

export default function SignupPage({ searchParams }: SignupPageProps) {
  const error =
    searchParams?.error === "auth"
      ? "Could not create account."
      : searchParams?.error === "invalid"
      ? "Enter a valid email + password."
      : null;

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-sm space-y-6">
        <div className="space-y-1">
          <h1 className="text-base font-light tracking-wide">Sign up</h1>
          <p className="text-sm text-foreground/70">Forman Roofing v1</p>
        </div>

        {error ? (
          <div className="rounded-xl border bg-card p-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {/* IMPORTANT: method="post" prevents 405 */}
        <form action="/auth/sign-up" method="post" className="space-y-3">
          <Input name="email" type="email" placeholder="Email" required />
          <Input
            name="password"
            type="password"
            placeholder="Password (min 6 chars)"
            required
            minLength={6}
          />
          <Button type="submit" className="w-full">
            Create account
          </Button>
        </form>

        <p className="text-sm text-foreground/70">
          Already have an account?{" "}
          <Link
            className="text-foreground underline underline-offset-4"
            href="/login"
          >
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
