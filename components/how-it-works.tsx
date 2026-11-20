import { examples, steps } from "@/lib/content";

export function HowItWorks() {
  return (
    <section className="border-t border-border/80 bg-muted/40" aria-labelledby="how-title">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:py-24">
        <p className="text-sm font-medium tracking-wide text-clay uppercase">How it works</p>
        <h2
          id="how-title"
          className="mt-3 max-w-xl font-heading text-3xl leading-tight tracking-tight text-balance sm:text-4xl"
        >
          You talk. It keeps the thread.
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
          Remi is a voice on the other end. You talk like you would to a friend. It doesn&apos;t
          reset when the conversation ends, and it brings the important part back later.
        </p>

        <ol className="mt-10 grid gap-8 sm:grid-cols-3">
          {steps.map((step, index) => (
            <li key={step.title}>
              <span className="font-heading text-3xl text-clay">{index + 1}</span>
              <h3 className="mt-2 font-heading text-xl tracking-tight">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ol>

        <div className="mt-14">
          <h3 className="font-heading text-2xl tracking-tight">The kind of thing it brings back</h3>
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {examples.map((example) => (
              <article
                key={example.when}
                className="flex flex-col rounded-3xl border border-border bg-card p-5 shadow-[0_16px_40px_-28px_rgba(80,40,10,0.55)] sm:p-6"
              >
                <p className="text-sm font-medium text-clay">{example.when}</p>
                <p className="mt-4 font-heading text-[1.65rem] leading-tight tracking-tight">
                  {example.line}
                </p>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{example.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
