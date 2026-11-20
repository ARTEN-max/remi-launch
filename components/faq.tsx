import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { faqs } from "@/lib/content";

export function Faq() {
  return (
    <section className="border-t border-border/80" aria-labelledby="faq-title">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-16 sm:py-24 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <div>
          <p className="text-sm font-medium tracking-wide text-clay uppercase">FAQ</p>
          <h2
            id="faq-title"
            className="mt-3 font-heading text-3xl leading-tight tracking-tight sm:text-4xl"
          >
            Questions, answered plainly
          </h2>
        </div>
        <Accordion hiddenUntilFound className="border-t border-border">
          {faqs.map((item) => (
            <AccordionItem key={item.id} value={item.id} className="border-border">
              <AccordionTrigger className="py-4 text-left font-heading text-lg tracking-tight hover:no-underline">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-base leading-relaxed text-muted-foreground">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
