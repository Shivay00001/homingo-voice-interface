// Voice Receptionist brain — port of the VQ Agent Core receptionist brain
// (~/workspace/money-lanes/ai-receptionist-demo/receptionist.py) to the browser.
//
// Pipeline (mirrors VQ Agent Core: LISTEN -> THINK -> ACT -> SPEAK):
//   LISTEN  browser Web Speech API turns voice into text (app.js)
//   THINK   route(text) picks an intent + slots, never inventing facts
//   ACT     booking state machine, emergency triage, human handoff
//   SPEAK   reply string is spoken back (app.js) and shown as text
//
// Zero keys, zero network, zero cost. Every turn is appended to a run log
// (same idea as VQ Agent Core runs/*.jsonl) and can be downloaded as JSON.
//
// Optional LLM polish (NOT wired by default): see README "Roadmap".
// The rule brain below is the complete working agent.

const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function findDay(text) {
  if (/\btoday\b/.test(text)) return "today";
  if (/\btomorrow\b/.test(text)) return "tomorrow";
  for (const d of DAYS) if (text.includes(d)) return d;
  return null;
}

function findService(text, services) {
  for (const name of Object.keys(services)) {
    if (text.includes(name)) return name;
  }
  return null;
}

function findSlot(text, slots) {
  const norm = text.replace(/\s+/g, "").toLowerCase();
  for (const s of slots) {
    if (norm.includes(s.replace(/\s+/g, "").toLowerCase())) return s;
  }
  if (/\bmorning\b/.test(text)) return slots[0];
  if (/\bafternoon\b/.test(text)) return slots[2] || slots[1];
  if (/\bevening\b/.test(text)) return slots[slots.length - 1];
  return null;
}

export function createAgent(business) {
  const state = {
    step: "idle", // idle | awaitDay | awaitTime | awaitName | awaitPhone | awaitConfirm
    booking: {},
  };
  const log = [];

  function dayLabel(day) {
    if (day === "today") return "today";
    if (day === "tomorrow") return "tomorrow";
    return day[0].toUpperCase() + day.slice(1);
  }

  function resolveDay(day) {
    if (day === "today") {
      const n = new Date().getDay();
      return DAYS[n];
    }
    if (day === "tomorrow") {
      const n = (new Date().getDay() + 1) % 7;
      return DAYS[n];
    }
    return day;
  }

  function slotsLine() {
    return business.slots.join(", ");
  }

  function handle(rawText) {
    const text = (rawText || "").toLowerCase().trim();
    const t0 = Date.now();
    let intent = "fallback";
    let reply = "";

    // --- Booking state machine takes priority while mid-flow ---
    if (state.step !== "idle") {
      if (/\b(cancel|stop|never mind|forget it)\b/.test(text)) {
        state.step = "idle";
        state.booking = {};
        intent = "booking_cancel";
        reply = "No problem — booking cancelled. Anything else I can help with?";
      } else if (state.step === "awaitDay") {
        const day = findDay(text);
        if (day) {
          const resolved = resolveDay(day);
          if (resolved === "sunday") {
            intent = "booking_day_closed";
            reply =
              "We're closed Sundays — but I can book you Saturday or Monday. Which day works?";
          } else {
            state.booking.day = resolved;
            state.step = "awaitTime";
            intent = "booking_day";
            reply = `Great — ${dayLabel(resolved)}. We have ${slotsLine()} open. What time suits you?`;
          }
        } else {
          intent = "booking_day_missing";
          reply = "Which day would you like — today, tomorrow, or a weekday? We're closed Sundays.";
        }
      } else if (state.step === "awaitTime") {
        const slot = findSlot(text, business.slots);
        if (slot) {
          state.booking.time = slot;
          state.step = "awaitName";
          intent = "booking_time";
          reply = `${slot} on ${dayLabel(state.booking.day)} — noted. May I have your name?`;
        } else {
          intent = "booking_time_missing";
          reply = `We have ${slotsLine()} open that day. Which time suits you?`;
        }
      } else if (state.step === "awaitName") {
        const name = rawText.trim().replace(/^(my name is|i am|i'm|this is)\s+/i, "");
        if (name.length >= 2) {
          state.booking.name = name;
          state.step = "awaitPhone";
          intent = "booking_name";
          reply = `Thanks ${name}. And a mobile number, so we can confirm by SMS?`;
        } else {
          intent = "booking_name_missing";
          reply = "Sorry, I didn't catch your name — could you say it again?";
        }
      } else if (state.step === "awaitPhone") {
        const digits = text.replace(/\D/g, "");
        if (digits.length >= 8) {
          state.booking.phone = digits;
          state.step = "awaitConfirm";
          intent = "booking_phone";
          reply =
            `To confirm: ${state.booking.name}, ${dayLabel(state.booking.day)} at ` +
            `${state.booking.time}. Shall I lock that in — yes or no?`;
        } else {
          intent = "booking_phone_missing";
          reply = "Could you repeat your mobile number, digit by digit?";
        }
      } else if (state.step === "awaitConfirm") {
        if (/\b(yes|yeah|yep|confirm|correct|lock it|book it)\b/.test(text)) {
          const b = state.booking;
          state.step = "idle";
          state.booking = {};
          intent = "booking_confirmed";
          reply =
            `Booked! ${b.name}, see you ${dayLabel(b.day)} at ${b.time}. ` +
            `We'll SMS a reminder to ${b.phone}. Anything else?`;
        } else if (/\b(no|not|change)\b/.test(text)) {
          state.step = "idle";
          state.booking = {};
          intent = "booking_not_confirmed";
          reply = "No problem — I haven't booked anything. Want a different day or time?";
        } else {
          intent = "booking_confirm_missing";
          reply = "Just to be sure — shall I confirm that booking, yes or no?";
        }
      }
    } else if (/\b(hi|hello|hey|good (morning|afternoon|evening))\b/.test(text) && text.length < 30) {
      intent = "greeting";
      reply = `Hello! Thanks for calling ${business.name}. How can I help — booking, hours, or pricing?`;
    } else if (/\b(emergency|pain|swelling|bleeding|broke|chipped|knocked out|hurts|ache)\b/.test(text)) {
      intent = "emergency";
      reply =
        `${business.emergencyLine} Can I book you in today at 3:30pm, ` +
        `or is morning better?`;
    } else if (/\b(human|person|real person|someone|operator|receptionist|manager)\b/.test(text)) {
      intent = "human_handoff";
      reply =
        `Of course — I'll put you through to the front desk. ` +
        `You can also reach us directly on ${business.phone}. One moment.`;
    } else if (/(hour|open|clos|timing|when do you)/.test(text)) {
      intent = "hours";
      reply = `We're open ${business.hours}. Would you like to book a slot?`;
    } else if (/\b(price|cost|how much|fee|charge)\b/.test(text)) {
      const service = findService(text, business.services);
      if (service) {
        intent = "pricing";
        reply = `A ${service} is ${business.services[service]}. Would you like me to book one for you?`;
      } else {
        intent = "pricing_list";
        const list = Object.entries(business.services)
          .map(([k, v]) => `${k} ${v}`)
          .join(", ");
        reply = `Our prices: ${list}. Which treatment were you asking about?`;
      }
    } else if (/(book|appoint|slot|visit|see (a|the) dentist|check.?up)/.test(text) || findDay(text)) {
      const day = findDay(text);
      if (day) {
        const resolved = resolveDay(day);
        if (resolved === "sunday") {
          intent = "booking_day_closed";
          reply = "We're closed Sundays — but I can book you Saturday 10:15am or Monday 9:00am. Which works?";
        } else {
          state.booking.day = resolved;
          state.step = "awaitTime";
          intent = "booking_day";
          reply = `Sure — ${dayLabel(resolved)}. We have ${slotsLine()} open. What time suits you?`;
        }
      } else {
        state.step = "awaitDay";
        intent = "booking_start";
        reply = "Happy to book you in. Which day works — today, tomorrow, or another day?";
      }
    } else if (findService(text, business.services)) {
      // Bare service mention ("tell me about whitening") -> give its price.
      const service = findService(text, business.services);
      intent = "pricing";
      reply = `A ${service} is ${business.services[service]}. Would you like me to book one for you?`;
    } else if (/\b(service|treatment|what do you (do|offer)|do you do)\b/.test(text)) {
      intent = "services";
      reply =
        `We do ${Object.keys(business.services).join(", ")}. ` +
        `Anything you'd like priced or booked?`;
    } else if (/\b(thank|thanks|great|perfect|bye|goodbye)\b/.test(text)) {
      intent = "thanks";
      reply = "You're welcome! Anything else before you go?";
    } else {
      intent = "fallback";
      reply =
        "I can help with bookings, opening hours, prices, or put you through to a human. " +
        "What would you like?";
    }

    const entry = {
      at: new Date().toISOString(),
      input: rawText,
      intent,
      reply,
      ms: Date.now() - t0,
    };
    log.push(entry);
    return { reply, intent, log: entry };
  }

  return { handle, state, log };
}
