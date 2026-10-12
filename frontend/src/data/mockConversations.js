// Shared mock conversation data — aligned to messages table schema.
// is_question: true  → appears in Inbox (AI identified a question worth answering)
// is_question: false → appears in Rejected (AI determined not a question / low confidence)

export const ALL_CONVERSATIONS = [
    // ── Inbox (is_question: true) ─────────────────────────────────────────────
    {
        id: 1,
        is_question: true,
        name: "Elena Rodriguez",
        avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuDJgNkGu9f13YNDjyOV7n4N3g3wuQsgZwQswurvDhnDnT4C-rt01GDEkhxsy2GJ9oxYCoRwa_iEsYJ0cRRU8CsRuT4p7H4MGV88iNCYyEKV_arkqcftSQ582FR5e6KwqELe-afmOR0sR75PKQEfuTLO3gv9TxHvtohTcykPAcm2bghfGMAafdK0SCabWEBbbPm18x1rSrjebzZQu0OfPzmxew5-xN6YZdwO_RFa7kqFhxzxyDe8_GpsgQ7iqNs3n2xvzHrxlY1r11Q",
        time: "12:45 PM",
        preview: "Consultation regarding project scope and timeline for Q1 expansion.",
        draft: "Hi Elena, that's perfect!...",
        email: "elena.r@agency.com",
        channel: "WEBSITE",
        read: false,
        messages: [
            { id: 1, from: "them", text: "Hello ReplyMind team, I was looking into your consulting services for our upcoming Q1 expansion. We need a clear timeline on the project scope and resource allocation. Do you have a standard deck or could we jump on a quick 15-minute call this Thursday afternoon?", time: "12:42 PM" },
            { id: 2, from: "me", text: "Hi Elena! Thanks for reaching out. We'd love to help with your expansion. I'm checking the team's availability for Thursday right now.", time: "12:44 PM" },
        ],
    },
    {
        id: 2,
        is_question: true,
        name: "Marcus Chen",
        avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuCseStnfjL13W5YyaQI-XnmGNENRqYD4tssz6Iu3o3Ig18Accr0L9InvC4GEjyB_IzZK-Oyyxt71nrcSyakJsTbsH28ll79pasT0I_oa2yEL3IifVtNozi_m-IavHsffevaBSXzGbKZnG0wDnRdwTkGJrigqQl4a1jk_UPCeDRLN1FmsW0rP7FE8jsQR863VCxfjELpKbepUieFTXa5XTNqPmgSvKsnJK8M9ay_PeHhkU0K4VHk1zt2Hp7gT1RPDuW03dV5TEeU7CA",
        time: "11:20 AM",
        preview: "Quick question about the invoice — is the net-30 still applicable for us?",
        draft: null,
        email: "m.chen@techco.io",
        channel: "EMAIL",
        read: false,
        messages: [
            { id: 1, from: "them", text: "Hey, just a quick question — the invoice you sent last week mentioned net-30 payment terms. Is that still the case for our account? We have a new finance team and they need to confirm.", time: "11:18 AM" },
        ],
    },
    {
        id: 3,
        is_question: true,
        name: "Priya Sharma",
        avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuDKwhvDEk7SJRMdASeGYXSsYklNs5cdjTK5Sypx6OJXSLqc8VhCDy6_CQy63evl8Gd036QS5R6QzNSdFH8XaDyDtP6xJckBR8-ypidv6kUTwj2pJ_PM3sGGVBW3LRbglutLeOyWW6qy3dLj3_G7RRQGyMRUybPNDErp0xjVgTDN1HPKoM96iaVnk5P5ZWXaetBk4U7xwH8vhxORCZ6hF9KMisCxM1Pb3m4pfluFF1Pl57VU6ehUTOELkpEPykm-ZDHSaH5mmEZGxAo",
        time: "Yesterday",
        preview: "Thanks for the follow-up! I'll review the proposal and get back to you by EOD.",
        draft: "Sounds great, looking forward to hearing from you!",
        email: "priya.s@startupx.com",
        channel: "WEBSITE",
        read: true,
        messages: [
            { id: 1, from: "me", text: "Hi Priya, just following up on the proposal we sent over last Tuesday. Let us know if you have any questions!", time: "9:10 AM" },
            { id: 2, from: "them", text: "Thanks for the follow-up! I'll review the proposal and get back to you by EOD.", time: "Yesterday" },
        ],
    },

    // ── Rejected (is_question: false) ─────────────────────────────────────────
    // AI determined these messages are not questions — no draft generated
    {
        id: 4,
        is_question: false,
        name: "James Okafor",
        avatar: "https://randomuser.me/api/portraits/men/32.jpg",
        time: "10:05 AM",
        preview: "Thanks, got it! See you on Friday.",
        draft: null,
        email: "j.okafor@ventures.ng",
        channel: "EMAIL",
        read: true,
        messages: [
            { id: 1, from: "me", text: "James, just confirming our Friday 2 PM call. We'll send the dial-in details shortly.", time: "9:50 AM" },
            { id: 2, from: "them", text: "Thanks, got it! See you on Friday.", time: "10:05 AM" },
        ],
    },
    {
        id: 5,
        is_question: false,
        name: "Sofia Mendez",
        avatar: "https://randomuser.me/api/portraits/women/44.jpg",
        time: "Mon",
        preview: "Perfect, I've forwarded it to our legal team for review.",
        draft: null,
        email: "sofia.m@globalretail.es",
        channel: "WEBSITE",
        read: true,
        messages: [
            { id: 1, from: "me", text: "Sofia, please find the signed NDA attached. Once your legal team reviews it we can move to the next step.", time: "Mon 3:20 PM" },
            { id: 2, from: "them", text: "Perfect, I've forwarded it to our legal team for review.", time: "Mon 4:45 PM" },
        ],
    },
    {
        id: 6,
        is_question: false,
        name: "Tariq Hassan",
        avatar: "https://randomuser.me/api/portraits/men/75.jpg",
        time: "Sun",
        preview: "Noted. Will circle back once the budget approval comes through.",
        draft: null,
        email: "tariq.h@buildco.pk",
        channel: "EMAIL",
        read: false,
        messages: [
            { id: 1, from: "them", text: "We liked your presentation last week. We'll need to wait for internal budget approval before we can commit. Should take about two weeks.", time: "Sun 11:00 AM" },
            { id: 2, from: "me", text: "Completely understood — take the time you need. We're here when you're ready.", time: "Sun 11:30 AM" },
            { id: 3, from: "them", text: "Noted. Will circle back once the budget approval comes through.", time: "Sun 11:45 AM" },
        ],
    },
];

export const INBOX_CONVERSATIONS = ALL_CONVERSATIONS.filter((c) => c.is_question === true);
export const REJECTED_CONVERSATIONS = ALL_CONVERSATIONS.filter((c) => c.is_question === false);
