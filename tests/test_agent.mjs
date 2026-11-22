// Tests for the Voice Receptionist brain. Run: node --test tests/test_agent.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { BUSINESS } from "../config.js";
import { createAgent } from "../agent.js";

const agent = () => createAgent(BUSINESS);

test("greeting names the business", () => {
  const a = agent();
  const r = a.handle("hello");
  assert.equal(r.intent, "greeting");
  assert.match(r.reply, /Bright Smile Dental/);
});

test("hours answer uses config hours only", () => {
  const a = agent();
  const r = a.handle("what are your opening hours?");
  assert.equal(r.intent, "hours");
  assert.match(r.reply, /Mon–Fri 8am–6pm, Sat 9am–2pm, Sun closed/);
});

test("pricing returns the exact configured price", () => {
  const a = agent();
  const r = a.handle("how much is a cleaning?");
  assert.equal(r.intent, "pricing");
  assert.match(r.reply, /\$149/);
  assert.doesNotMatch(r.reply, /\$200|\$99/);
});

test("unknown service never invents a price", () => {
  const a = agent();
  const r = a.handle("how much is a gold crown?");
  assert.equal(r.intent, "pricing_list");
  assert.match(r.reply, /cleaning \$149/);
  assert.doesNotMatch(r.reply, /gold crown is \$\d/);
});

test("emergency triages to same-day slots", () => {
  const a = agent();
  const r = a.handle("I have terrible tooth pain");
  assert.equal(r.intent, "emergency");
  assert.match(r.reply, /same-day emergency/);
});

test("human handoff gives the front-desk number", () => {
  const a = agent();
  const r = a.handle("can I speak to a human please?");
  assert.equal(r.intent, "human_handoff");
  assert.match(r.reply, /\+61 2 9000 1234/);
});

test("booking flow end-to-end: day -> time -> name -> phone -> confirm", () => {
  const a = agent();
  let r = a.handle("I need an appointment on Saturday");
  assert.equal(r.intent, "booking_day");
  assert.equal(a.state.step, "awaitTime");
  r = a.handle("10:15am");
  assert.equal(r.intent, "booking_time");
  assert.equal(a.state.step, "awaitName");
  r = a.handle("Priya Sharma");
  assert.equal(r.intent, "booking_name");
  assert.equal(a.state.step, "awaitPhone");
  r = a.handle("0412 345 678");
  assert.equal(r.intent, "booking_phone");
  assert.equal(a.state.step, "awaitConfirm");
  r = a.handle("yes, confirm it");
  assert.equal(r.intent, "booking_confirmed");
  assert.match(r.reply, /Booked! Priya Sharma/);
  assert.match(r.reply, /Saturday at 10:15am/);
  assert.equal(a.state.step, "idle");
});

test("Sunday booking is refused with alternatives", () => {
  const a = agent();
  const r = a.handle("book me on Sunday");
  assert.equal(r.intent, "booking_day_closed");
  assert.match(r.reply, /closed Sundays/);
});

test("booking can be cancelled mid-flow", () => {
  const a = agent();
  a.handle("I want to book");
  const r = a.handle("cancel");
  assert.equal(r.intent, "booking_cancel");
  assert.equal(a.state.step, "idle");
});

test("fallback never invents, offers real options", () => {
  const a = agent();
  const r = a.handle("do you sell bicycles?");
  assert.equal(r.intent, "fallback");
  assert.match(r.reply, /bookings, opening hours, prices/);
});

test("every turn is logged with intent and timing", () => {
  const a = agent();
  a.handle("hello");
  a.handle("how much is whitening?");
  assert.equal(a.log.length, 2);
  assert.equal(a.log[1].intent, "pricing");
  assert.match(a.log[1].reply, /\$399/);
  assert.ok(typeof a.log[1].ms === "number");
});
