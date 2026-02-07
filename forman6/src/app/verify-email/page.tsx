import Link from "next/link";

type Props = {
  searchParams: Promise<{ email?: string }>;
};

export default async function VerifyEmailPage({ searchParams }: Props) {
  const { email } = await searchParams;

  return (
    <main className="mx-auto max-w-xl space-y-6 p-6">
      <div>
        <div className="text-sm text-foreground/60">One last step</div>
        <h1 className="text-lg font-light tracking-wide">Verify your email</h1>
      </div>

      <div className="rounded-2xl border bg-card p-4 text-sm text-foreground/70">
        {email ? (
          <>We sent a verification email to <span className="text-foreground">{email}</span>. Open it and click the link.</>
        ) : (
          <>Check your email for a verification link.</>
        )}
        <div className="mt-2 text-xs text-foreground/50">
          If you turned email confirmation off for the demo, you don’t need this screen—just log in.
        </div>
      </div>

      <div className="flex gap-2">
        <Link
          href="/login"
          className="inline-flex h-10 items-center justify-center rounded-xl bg-white px-4 text-sm text-black"
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
    </main>
  );
}