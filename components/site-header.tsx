import { buttonVariants } from "@/components/ui/button";
import { founderX } from "@/lib/content";
import { cn } from "cn";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-border/80 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-5 sm:h-16">
        <a href="#top" className="font-heading text-2xl tracking-tight text-foreground">
          Remi
        </a>
        <a
          href={founderX}
          className="hidden text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline sm:inline"
        >
          @AbdulRahmahk1x
        </a>
        <a
          href="#signup"
          className={cn(buttonVariants({ size: "lg" }), "h-10 px-4 text-sm")}
        >
          Join the list
        </a>
      </div>
    </header>
  );
}
