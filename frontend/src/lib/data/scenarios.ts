export type ChannelKey = "wa" | "em" | "web";

export interface DemoScenario {
  channel: string;
  key: ChannelKey;
  color: string;
  text: string;
  draft: string;
}

// Cycled by the live-demo card in the "See It In Action" section. Order and
// timing come from the original component's `runCycle`/`startTyping` logic.
export const scenarios: DemoScenario[] = [
  {
    channel: "WhatsApp",
    key: "wa",
    color: "#1e2294",
    text: "Do you deliver on Sundays?",
    draft: "Yes — we deliver every Sunday, 10am to 6pm. Orders placed before 4pm arrive the same day.",
  },
  {
    channel: "Email",
    key: "em",
    color: "#83837d",
    text: "What are your prices for the summer collection?",
    draft: "Our summer collection starts at Rs 2,400. I have attached the full price list for you.",
  },
  {
    channel: "Website",
    key: "web",
    color: "#4a52c9",
    text: "Are you open right now?",
    draft: "We are open today until 9pm. You can also order online any time and we will confirm shortly.",
  },
];
