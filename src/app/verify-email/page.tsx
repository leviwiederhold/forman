import Link from "next/link";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ email?: string }>;
};

export default async function VerifyEmailPage({ searchParams }: Props) {
  const { email } = await searchParams;

  return (
    <main className="mx-auto max-w-xl space-y-6 p-6">
      <div>
        <div className="text-sm text-foreground/70">One last step</div>
        <h1 className="text-lg font-light tracking-wide">Verify your email</h1>
      </div>

      <div className="rounded-2xl border bg-card p-4 text-sm text-foreground/70">
        We sent you a verification email{email ? ` to ${email}` : ""}. Open it
        and click the link to activate your account.
        <div className="mt-2 text-xs text-foreground/50">
          Check spam/junk if you don’t see it in 1–2 minutes.
        </div>
      </div>

      <div className="flex gap-2">
        <Button asChild>
          <Link href="/login">Go to login</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/signup">Use a different email</Link>
        </Button>
      </div>
    </main>
  );
}