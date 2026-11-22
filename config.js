// Business data — single source of truth for prices, hours and slots.
// The agent NEVER invents a price or a time that is not listed here.
// Rebrand by editing this file only.
export const BUSINESS = {
  name: "Bright Smile Dental",
  city: "Sydney",
  phone: "+61 2 9000 1234", // demo number — replace with the real clinic number
  tagline: "AI voice receptionist — answers every call, books every patient",
  hours: "Mon–Fri 8am–6pm, Sat 9am–2pm, Sun closed",
  openDays: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
  services: {
    cleaning: "$149",
    checkup: "$89",
    filling: "from $180",
    "root canal": "from $900",
    implant: "from $2,900",
    whitening: "$399",
    braces: "from $4,500",
  },
  // Bookable slots per open day (demo schedule).
  slots: ["9:00am", "10:15am", "2:45pm", "4:30pm"],
  emergencyLine: "If it is severe pain, swelling or bleeding, we keep same-day emergency slots.",
};

export const SAMPLE_PROMPTS = [
  "What are your opening hours?",
  "How much is a cleaning?",
  "I need an appointment on Saturday",
  "I have terrible tooth pain",
  "Can I speak to a human?",
];
