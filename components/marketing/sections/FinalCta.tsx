import Link from "next/link";
import Button from "@/components/ui/Button";
import Container from "@/components/ui/Container";

export default function FinalCta() {
  return (
    <section className="py-24">
      <Container>
        <div className="relative isolate overflow-hidden rounded-3xl border border-white/10 bg-surface px-6 py-16 text-center sm:px-12 sm:py-20">
          <div className="brand-gradient pointer-events-none absolute -top-32 left-1/2 -z-10 h-64 w-[36rem] -translate-x-1/2 rounded-full opacity-20 blur-3xl" />
          <div className="brand-gradient pointer-events-none absolute -bottom-40 left-1/2 -z-10 h-64 w-[30rem] -translate-x-1/2 rounded-full opacity-[0.15] blur-3xl" />

          <h2 className="mx-auto max-w-3xl text-3xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-4xl lg:text-5xl">
            Ready to put your content on{" "}
            <span className="text-brand-gradient">every screen</span>?
          </h2>

          <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild className="h-14 w-full px-8 text-lg sm:w-auto">
              <Link href="/register">Start Free →</Link>
            </Button>
            <Button
              asChild
              variant="secondary"
              className="h-14 w-full px-8 text-lg sm:w-auto"
            >
              <Link href="/contact">Talk to us</Link>
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
}
