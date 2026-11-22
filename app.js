// UI wiring: voice in (Web Speech Recognition) -> agent -> voice out (speechSynthesis).
// Text input is a fallback for browsers without SpeechRecognition (e.g. Firefox).
import { BUSINESS, SAMPLE_PROMPTS } from "./config.js";
import { createAgent } from "./agent.js";

const agent = createAgent(BUSINESS);

const $ = (id) => document.getElementById(id);
const logEl = $("log");
const statusEl = $("status");
const micBtn = $("micBtn");
const speakToggle = $("speakToggle");
const inputEl = $("textInput");
const sendBtn = $("sendBtn");

let listening = false;
let recognition = null;

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition || null;

function addMsg(who, text) {
  const div = document.createElement("div");
  div.className = "msg " + who;
  div.textContent = (who === "you" ? "You: " : "Receptionist: ") + text;
  logEl.appendChild(div);
  logEl.scrollTop = logEl.scrollHeight;
}

function speak(text) {
  if (!speakToggle.checked || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 1.0;
  window.speechSynthesis.speak(u);
}

function respond(text) {
  const { reply, intent } = agent.handle(text);
  addMsg("agent", reply);
  statusEl.textContent = "Intent: " + intent + "  ·  " + agent.log.length + " turns logged";
  speak(reply);
  return reply;
}

function setListening(on) {
  listening = on;
  micBtn.classList.toggle("listening", on);
  micBtn.textContent = on ? "● Listening… tap to stop" : "🎙 Hold to talk — tap mic";
  statusEl.textContent = on
    ? "Listening… speak now"
    : "Ready — tap the mic or type below";
}

if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.lang = "en-AU";
  recognition.interimResults = true;
  recognition.continuous = false;
  let finalText = "";
  recognition.onresult = (e) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) finalText += t;
      else interim += t;
    }
    if (interim) statusEl.textContent = "Hearing: " + interim;
    if (finalText) {
      addMsg("you", finalText);
      respond(finalText);
      finalText = "";
    }
  };
  recognition.onend = () => { if (listening) setListening(false); };
  recognition.onerror = (e) => {
    setListening(false);
    statusEl.textContent = "Mic error: " + e.error + " — type instead, or allow microphone access.";
  };
} else {
  micBtn.disabled = true;
  micBtn.textContent = "🎙 Voice not supported in this browser — type below";
}

micBtn.addEventListener("click", () => {
  if (!recognition) return;
  if (listening) {
    recognition.stop();
    setListening(false);
  } else {
    try {
      recognition.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }
});

function sendText() {
  const v = inputEl.value.trim();
  if (!v) return;
  inputEl.value = "";
  addMsg("you", v);
  respond(v);
}
sendBtn.addEventListener("click", sendText);
inputEl.addEventListener("keydown", (e) => { if (e.key === "Enter") sendText(); });

$("downloadLog").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(agent.log, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "voice-receptionist-runlog.json";
  a.click();
});

// Sample prompt chips
const chips = $("chips");
for (const p of SAMPLE_PROMPTS) {
  const b = document.createElement("button");
  b.className = "chip";
  b.textContent = p;
  b.addEventListener("click", () => { addMsg("you", p); respond(p); });
  chips.appendChild(b);
}

// Business card
$("bizName").textContent = BUSINESS.name + " — " + BUSINESS.city;
$("bizHours").textContent = "Hours: " + BUSINESS.hours;
$("bizPhone").textContent = "Front desk: " + BUSINESS.phone;
addMsg("agent", `Hello! Thanks for calling ${BUSINESS.name}. How can I help — booking, hours, or pricing?`);
