export interface Persona {
  title: string;
  sub: string;
}

// The base 3 personas, repeated twice in the DOM so the carousel track can
// slide upward indefinitely without an visible seam (see JourneyAnimation).
export const personas: Persona[] = [
  { title: "RETAIL SHOPPER", sub: "ASKS ON WHATSAPP" },
  { title: "CLINIC PATIENT", sub: "EMAILS AFTER HOURS" },
  { title: "CAFE VISITOR", sub: "CHATS ON WEBSITE" },
];

export const personaTrack: Persona[] = [...personas, ...personas];
