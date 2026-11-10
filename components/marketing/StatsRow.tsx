import Card from "@/components/ui/Card";
import Container from "@/components/ui/Container";
import { cn } from "@/lib/utils";

const stats = [
  { value: "6-digit", label: "Screen pairing" },
  { value: "Real-time", label: "Content delivery" },
  { value: "Unlimited", label: "Media uploads" },
  { value: "24/7", label: "Screen visibility" },
];

export default function StatsRow() {
  return (
    <section
      aria-label="Platform highlights"
      className="py-24"
    >
      <Container>
        <Card className="grid grid-cols-2 overflow-hidden p-0 hover:border-white/10 hover:shadow-none sm:grid-cols-4">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className={cn(
                "px-4 py-7 text-center sm:px-6 sm:py-8",
                index >= 2 && "border-t border-white/10 sm:border-t-0",
                index % 2 === 1 && "border-l border-white/10",
                index > 0 && "sm:border-l sm:border-white/10",
                index === 0 && "sm:border-l-0",
              )}
            >
              <p className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                {stat.value}
              </p>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted sm:text-xs">
                {stat.label}
              </p>
            </div>
          ))}
        </Card>
      </Container>
    </section>
  );
}
