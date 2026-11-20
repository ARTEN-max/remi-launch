import { buttonVariants } from "@/components/ui/button";
import { founderX } from "@/lib/content";
import { cn } from "cn";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-heading text-2xl tracking-tight">Remi</p>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Pre-launch. The waitlist is the whole product for now. Built in public by a University
            of Waterloo math student.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <a
            href={founderX}
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            @AbdulRahmahk1x
          </a>
          <a href="#signup" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 px-4")}>
            Get a spot
          </a>
        </div>
      </div>
    </footer>
  );
}
