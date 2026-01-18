import Link from "next/link";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function first(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function VerifyEmailPage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {};
  const redirectTo = first(sp.redirectTo) ?? "/dashboard";

  return (
    <main className="mx-auto max-w-lg space-y-4 p-6">
      <div>
        <div className="text-sm text-foreground/70">One last step</div>
        <h1 className="text-lg font-light tracking-wide">Verify your email</h1>
      </div>

      <div className="rounded-2xl border bg-card p-4 text-sm text-foreground/70">
        We sent you a verification email. Open it and click the link to activate
        your account.
        <div className="mt-2 text-xs text-foreground/60">
          Check spam/junk if you don’t see it in 1–2 minutes.
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href={`/login?redirectTo=${encodeURIComponent(redirectTo)}`}>
            Go to login
          </Link>
        </Button>

        <Button asChild variant="outline">
          <Link href="/signup">Use a different email</Link>
        </Button>
      </div>

      <div className="text-xs text-foreground/50">
        If you’re testing locally, make sure your Supabase “Site URL” and
        redirect URLs include your Vercel domain.
      </div>
    </main>
  );
}
