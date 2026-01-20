import Link from "next/link";

type Props = {
  searchParams: Promise<{ email?: string }>;
};

export const dynamic = "force-dynamic";

export default async function VerifyEmailPage({ searchParams }: Props) {
  const { email } = await searchParams;

  return (
    <main className="mx-auto max-w-xl space-y-4 p-6">
      <div className="text-xs text-foreground/60">One last step</div>
      <h1 className="text-2xl font-light tracking-wide">Verify your email</h1>

      <div className="rounded-2xl border bg-card p-4 text-sm text-foreground/70">
        We sent you a verification email{email ? ` to ${email}` : ""}. Open it and
        click the link to activate your account.
        <div className="mt-2 text-xs text-foreground/50">
          Check spam/junk if you don’t see it in 1–2 minutes.
        </div>
      </div>

      <div className="flex gap-2">
        <Link
          href="/login"
          className="inline-flex h-10 items-center justify-center rounded-xl border bg-white px-4 text-sm text-black"
        >
          Go to login
        </Link>

        <Link
          href="/signup"
          className="inline-flex h-10 items-center justify-center rounded-xl border px-4 text-sm"
        >
          Use a different email
        </Link>
      </div>

      <div className="text-xs text-foreground/50">
        Tip: after you click the email link, you should land back in the app and
        be signed in automatically.
      </div>
    </main>
  );
}