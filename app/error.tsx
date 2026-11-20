"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto max-w-xl px-5 py-24">
      <h1 className="font-heading text-4xl tracking-tight">Something went sideways.</h1>
      <p className="mt-3 text-muted-foreground">The page didn&apos;t load. You can try it again.</p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-6 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
      >
        Try again
      </button>
    </main>
  );
}
