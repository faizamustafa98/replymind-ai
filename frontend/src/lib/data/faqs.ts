export interface Faq {
  q: string;
  a: string;
}

export const faqs: Faq[] = [
  {
    q: "Does the AI ever send a message without me approving it?",
    a: "No — by default every draft waits for your review. You can opt into auto-reply only for high-confidence responses, and it's off unless you turn it on.",
  },
  {
    q: "What happens if the AI doesn't know the answer?",
    a: "It says so in the draft instead of guessing, so you can step in and write the reply yourself.",
  },
  {
    q: "Which channels are supported?",
    a: "WhatsApp Business, Email, and a Website chat widget — all in one inbox.",
  },
  {
    q: "How do I connect WhatsApp?",
    a: "Through Meta's official WhatsApp Business API — we walk you through verification during setup.",
  },
  {
    q: "Is my customers' data safe?",
    a: "Yes — every business's data is isolated at the database level, so no other business can ever access it.",
  },
  {
    q: "Can I try it before paying?",
    a: "Yes — the Free plan works forever with no credit card, and Pro/Business come with a 14-day free trial.",
  },
];
