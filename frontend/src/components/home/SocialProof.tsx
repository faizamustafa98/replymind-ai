import { Reveal } from "@/src/components/ui/Reveal";

const stats = [
  { value: "12×", label: "Cheaper than a human support agent" },
  { value: "3→1", label: "Channels unified into one inbox" },
  { value: "100%", label: "Drafts reviewed before sending" },
];

export function SocialProof() {
  return (
    <section className="border-b border-border bg-bg px-6 py-20">
      <div className="mx-auto max-w-[1180px]">
        <Reveal className="mb-11 max-w-[620px]">
          <span className="text-xs font-medium uppercase tracking-[.08em] text-coral">By the numbers</span>
          <h2 className="m-0 mt-3 font-display text-[38px] font-semibold leading-[1.15] text-ink">
            Faster replies, without the overhead
          </h2>
        </Reveal>
        <Reveal className="grid gap-10 max-[900px]:grid-cols-1 min-[901px]:grid-cols-3">
          {stats.map((s) => (
            <div key={s.label} className="border-l-2 border-coral pl-[22px]">
              <div className="font-display text-[54px] font-bold leading-none tracking-[-.02em] text-text-primary">
                {s.value}
              </div>
              <div className="mt-2.5 text-sm text-text-secondary">{s.label}</div>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
