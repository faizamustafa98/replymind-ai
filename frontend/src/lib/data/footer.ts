export interface FooterLink {
  href: string;
  label: string;
}

// None of these link anywhere real yet (no social pages, docs, etc. exist for
// this fictional product) — kept intentionally short. Swap in real ones
// whenever they exist instead of padding this out to look "complete."
export const footerLinks: FooterLink[] = [
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
  { href: "#top", label: "Terms" },
  { href: "#top", label: "Privacy" },
];
