import { Faq } from "@/components/faq";
import { FounderNote } from "@/components/founder-note";
import { HowItWorks } from "@/components/how-it-works";
import { SignupForm } from "@/components/signup-form";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { faqs } from "@/lib/content";
import { getSiteUrl } from "@/lib/site";

export default function Page() {
  const siteUrl = getSiteUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: "Remi",
        url: siteUrl,
        description:
          "Most AI forgets you the second you open a new chat. Remi remembers you for years.",
      },
      {
        "@type": "FAQPage",
        mainEntity: faqs.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <a
        href="#signup"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-card focus:px-3 focus:py-2"
      >
        Skip to the waitlist form
      </a>
      <SiteHeader />
      <main id="top">
        <section className="mx-auto grid max-w-6xl items-start gap-8 px-5 pt-8 pb-16 sm:pt-14 sm:pb-20 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)] lg:gap-14 lg:pt-20">
          <div>
            <p className="text-sm font-medium tracking-wide text-clay uppercase">Waitlist open</p>
            <h1 className="mt-3 font-heading text-[1.85rem] leading-[1.12] tracking-tight text-balance sm:text-5xl sm:leading-[1.08] lg:text-[3.35rem]">
              Most AI forgets you the second you open a new chat.{" "}
              <span className="text-clay italic">Remi remembers you for years.</span>
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Remi is an AI voice you talk to like a friend. It holds what you share for months and
              years, checks in, and brings back the detail you mentioned once.
            </p>
            <p className="mt-5 hidden max-w-md text-sm leading-relaxed text-muted-foreground lg:block">
              Three weeks after you mention an interview, it asks if you heard back. That&apos;s the
              whole idea.
            </p>
          </div>
          <SignupForm />
        </section>
        <HowItWorks />
        <FounderNote />
        <Faq />
      </main>
      <SiteFooter />
    </>
  );
}
