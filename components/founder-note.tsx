import { founderX } from "@/lib/content";

export function FounderNote() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-16 sm:py-24" aria-labelledby="founder-title">
      <p className="text-sm font-medium tracking-wide text-clay uppercase">From the person building it</p>
      <h2 id="founder-title" className="sr-only">
        A note from the founder
      </h2>
      <blockquote className="mt-4 max-w-3xl border-l-2 border-primary pl-5 font-heading text-2xl leading-snug tracking-tight text-balance sm:text-3xl">
        I kept opening a new chat and losing the person I had just been. A friend who forgets you
        every time isn&apos;t much of a friend. So I&apos;m building one that doesn&apos;t.
      </blockquote>
      <p className="mt-6 max-w-xl text-sm leading-relaxed text-muted-foreground">
        Building in public, from a math program at the University of Waterloo. Follow along{" "}
        <a
          href={founderX}
          className="text-foreground underline decoration-primary/60 underline-offset-4 hover:decoration-primary"
        >
          @AbdulRahmahk1x
        </a>
        .
      </p>
    </section>
  );
}
