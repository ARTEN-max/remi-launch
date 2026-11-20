import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-xl px-5 py-24">
        <p className="text-sm font-medium text-clay">404</p>
        <h1 className="mt-3 font-heading text-4xl tracking-tight">This page isn&apos;t here.</h1>
        <p className="mt-3 text-muted-foreground">The waitlist is on the home page.</p>
        <Link href="/" className="mt-6 inline-block text-sm underline underline-offset-4">
          Back to Remi
        </Link>
      </main>
    </>
  );
}
