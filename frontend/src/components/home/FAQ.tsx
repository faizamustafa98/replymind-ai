import { Reveal } from "@/src/components/ui/Reveal";
import { faqs } from "@/src/lib/data/faqs";

/**
 * Static Q&A grid (no accordion, no card/box) — each item reveals
 * bottom-to-top on scroll, staggered left to right / row by row via
 * <Reveal>'s existing translateY(16px)→0 animation.
 */
export function FAQ() {
  return (
    <section id="faq" className="bg-bg px-6 py-24">
      <div className="mx-auto max-w-[1100px]">
        <Reveal>
          <h2 className="m-0 mb-12 font-display text-[32px] font-bold leading-[1.15] text-ink">
            Frequently Asked Questions
          </h2>
        </Reveal>

        <div className="grid gap-x-10 gap-y-9 max-[900px]:grid-cols-1 min-[901px]:grid-cols-3">
          {faqs.map((faq, i) => (
            <Reveal key={faq.q} delay={i * 60}>
              <div className="flex items-start gap-2">
                <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full border border-ink/40 text-[11px] font-semibold text-ink/60">
                  ?
                </span>
                <h3 className="m-0 text-[15px] font-semibold leading-snug text-ink">{faq.q}</h3>
              </div>
              <p className="m-0 mt-2 pl-7 text-sm leading-relaxed text-text-secondary">{faq.a}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
