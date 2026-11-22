# Voice Receptionist — Homingo Hack Days, Track C2: “Voice is the interface”

**Status: Day 2 build (22 Nov 2026) — working skeleton, live in this repo.**
Registered solo, Agents track. Build phase 21 Nov–6 Dec 2026; submission window **4–6 Dec, closes 6 Dec 23:59 IST**. Dashboard sign-in + submission are the founder's steps (not done here).

> **Track note:** C2 was picked because it reuses the most existing work (the live VQ Agent Core / AI Voice Receptionist). The track can switch on the founder's word — A2, B1 and C1 were the alternates.

## The problem (C2)

Small businesses miss calls they never hear about. A dental clinic that spends on ads and still loses patients is not losing them to bad leads — it loses them to **no answer in the first 5 minutes**. Voice is the interface customers already use: they call. This app is the receptionist that always picks up.

## What it does

A voice-first AI receptionist for a small business (demo business: Bright Smile Dental, Sydney — rebrand by editing `config.js` only):

- **🎙 Voice in** — browser Web Speech Recognition turns speech into text; **voice out** via speech synthesis. Text input works everywhere as a fallback.
- **🧠 Agent brain** — intent routing + a booking state machine (day → time → name → phone → confirm), emergency triage (pain/swelling/bleeding → same-day slots), pricing from config only, human handoff with the front-desk number.
- **🚫 Never invents** — prices, hours and slots come only from `config.js`. Unknown treatments get the real price list, never a made-up number.
- **📋 Run log** — every turn is logged (intent, reply, ms) and downloadable as JSON — the browser version of VQ Agent Core's `runs/*.jsonl`.

## Pipeline (from VQ Agent Core)

```
LISTEN  Web Speech API (voice → text)        [app.js]
THINK   intent router + slots                [agent.js]
ACT     booking state machine, triage, handoff
SPEAK   speechSynthesis (voice) + text log   [app.js]
```

The brain is a port of the offline rule-based receptionist in VisionQuantech's VQ Agent Core (`agent.py`: THINK → ACT → DECIDE loop), rebuilt for the browser so the demo runs with **zero keys, zero network, zero cost**.

## Run it (30 seconds)

```bash
python3 server.py            # serves on http://localhost:8000
# open http://localhost:8000 in Chrome or Edge for voice
# (any browser works for text)
```

Or open `index.html` directly — voice needs a secure context in some browsers, so the local server is recommended.

Try: *“What are your opening hours?”* → *“How much is a cleaning?”* → *“Book me Saturday morning”* → follow the prompts to a confirmed booking.

## Tests

```bash
node --test tests/test_agent.mjs   # 11 tests, all passing
```

Covers: greeting, hours, exact pricing, no invented prices, emergency triage, human handoff, full booking flow, Sunday-closed refusal, cancel mid-flow, fallback, run logging.

## Roadmap to submission (4–6 Dec)

- [x] Day 2 (22 Nov): voice-first skeleton, working end-to-end locally
- [ ] Optional LLM polish: free-tier Gemini/Groq key field (validated against `config.js` — minutes/prices never rewritten by the model)
- [ ] Multi-business switcher (dental / salon / garage) from one config
- [ ] Call-recording transcript view + missed-call summary panel
- [ ] 60-second demo video (scripted walkthrough)
- [ ] Homingo dashboard submission (founder's sign-in, 4–6 Dec)

## Cost

₹0 / $0. No API keys, no paid services, no backend. Everything runs in the browser.
