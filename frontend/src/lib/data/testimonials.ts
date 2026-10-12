export interface Testimonial {
  name: string;
  business: string;
  quote: string;
  accent: string;
  initials: string;
}

/**
 * Carried over from the original component's `this.testimonials` state.
 * NOTE: the source design never actually renders a testimonials section
 * (no `data-testi-grid` markup exists in ReplyMind.dc.html, even though the
 * CSS and component state reference one) — so this data isn't wired into
 * any component yet. Kept here, typed, in case a Testimonials section gets
 * added later. See CONTRIBUTING.md.
 */
export const testimonials: Testimonial[] = [
  { name: "Amina Raza", business: "Clothing Boutique, Karachi", quote: "Cut our reply time from hours to minutes.", accent: "#1e2294", initials: "AR" },
  { name: "Usman Tariq", business: "Family Clinic, Lahore", quote: "Patients get answers even after hours.", accent: "#3339b0", initials: "UT" },
  { name: "Fatima Sheikh", business: "Home Bakery, Islamabad", quote: "I used to lose orders to slow replies. Not anymore.", accent: "#4a52c9", initials: "FS" },
  { name: "Bilal Ahmed", business: "Electronics Repair, Karachi", quote: "Customers get instant answers about pricing and turnaround.", accent: "#1e2294", initials: "BA" },
  { name: "Sana Malik", business: "Skincare Brand, Lahore", quote: "Feels like I hired a support agent for a fraction of the cost.", accent: "#83837d", initials: "SM" },
  { name: "Hamza Iqbal", business: "Restaurant, Islamabad", quote: "WhatsApp orders used to pile up. Now everything's in one place.", accent: "#4a52c9", initials: "HI" },
];
