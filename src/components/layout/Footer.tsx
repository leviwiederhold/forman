export default function Footer() {
  return (
    <footer className="mt-auto border-t bg-background">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div className="text-xs text-foreground/50">
          © {new Date().getFullYear()} Forman
        </div>

        <a
          href="/feedback"
          className="text-xs text-foreground/50 hover:text-foreground hover:underline"
        >
          How can we improve?
        </a>
      </div>
    </footer>
  );
}
