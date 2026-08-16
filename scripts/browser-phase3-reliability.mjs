const action = process.argv[2];
const email = process.argv[3]?.trim().toLowerCase();
const appUrl = (process.env.TEST_APP_URL || "http://127.0.0.1:8080").replace(
  /\/$/,
  "",
);
if (!action || !email)
  throw new Error("Action and controlled email are required.");

const cases = {
  newsletter_home: { path: "/", success: "subscribed" },
  newsletter_footer: { path: "/contact", success: "subscribed" },
  contact: { path: "/contact", success: "your enquiry is in" },
  destination: {
    path: "/destinations/everest-region",
    success: "itinerary request is in",
  },
  experience: {
    path: "/experiences/adventure",
    success: "inquiry is safely with us",
  },
};
const testCase = cases[action];
if (!testCase) throw new Error(`Unsupported action: ${action}`);

const pages = await fetch("http://127.0.0.1:9222/json/list").then((response) =>
  response.json(),
);
const page = pages.find((item) => item.type === "page");
if (!page?.webSocketDebuggerUrl)
  throw new Error("No Chrome page is available.");
const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let nextId = 1;
const pending = new Map();
const errors = [];
const requests = new Map();
const completedPosts = [];
socket.addEventListener("message", (event) => {
  const payload = JSON.parse(event.data);
  if (payload.id) {
    const waiter = pending.get(payload.id);
    if (!waiter) return;
    pending.delete(payload.id);
    if (payload.error) waiter.reject(new Error(payload.error.message));
    else waiter.resolve(payload.result);
    return;
  }
  if (payload.method === "Runtime.exceptionThrown")
    errors.push(
      payload.params.exceptionDetails.exception?.description ||
        payload.params.exceptionDetails.text,
    );
  if (payload.method === "Network.requestWillBeSent") {
    const { requestId, request, timestamp } = payload.params;
    if (request.method === "POST")
      requests.set(requestId, { url: request.url, startedAt: timestamp });
  }
  if (payload.method === "Network.responseReceived") {
    const request = requests.get(payload.params.requestId);
    if (request) request.status = payload.params.response.status;
  }
  if (payload.method === "Network.loadingFinished") {
    const request = requests.get(payload.params.requestId);
    if (request) {
      completedPosts.push({
        url: request.url,
        status: request.status,
        durationMs: Math.round(
          (payload.params.timestamp - request.startedAt) * 1000,
        ),
      });
      requests.delete(payload.params.requestId);
    }
  }
});

function send(method, params = {}) {
  const id = nextId++;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}
async function evaluate(expression) {
  const result = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails)
    throw new Error(
      result.exceptionDetails.exception?.description || "Evaluation failed.",
    );
  return result.result.value;
}
const delay = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

await send("Page.enable");
await send("Runtime.enable");
await send("Network.enable");
await send("Page.navigate", { url: `${appUrl}${testCase.path}` });
await delay(3_500);
errors.length = 0;
completedPosts.length = 0;

await evaluate(`(() => {
  const set = (element, value) => {
    if (!element) throw new Error("Required test field was not found.");
    const prototype = element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : element instanceof HTMLSelectElement
        ? HTMLSelectElement.prototype
        : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, "value").set.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  };
  const action = ${JSON.stringify(action)};
  const email = ${JSON.stringify(email)};
  if (action.startsWith("newsletter")) {
    const source = action === "newsletter_home" ? "homepage" : "footer";
    const input = document.querySelector("#newsletter-" + source);
    set(input, email);
    input.closest("form").requestSubmit();
    return;
  }
  const marker = action === "contact"
    ? 'textarea[name="message"]'
    : action === "destination"
      ? 'textarea[name="message"][aria-label="Trip notes"]'
      : 'textarea[name="message"]';
  const form = document.querySelector(marker)?.closest("form");
  if (!form) throw new Error("Inquiry form was not found.");
  set(form.querySelector('[name="name"]'), "Phase 3 Reliability Traveller");
  set(form.querySelector('[name="email"]'), email);
  const phone = form.querySelector('[name="phone"]');
  if (phone) set(phone, "+9779800000000");
  const date = form.querySelector('[name="date"], [name="dates"]');
  if (date) set(date, "2026-10-15");
  const travellers = form.querySelector('[name="travellers"]');
  if (travellers) set(travellers, "2");
  set(form.querySelector('[name="message"]'), "PHASE 3 RELIABILITY BROWSER TEST " + action);
  form.requestSubmit();
})()`);

const submittedAt = Date.now();
let completionMs = null;
for (let attempt = 0; attempt < 150; attempt += 1) {
  await delay(100);
  const body = await evaluate("document.body.innerText.toLowerCase()");
  if (body.includes(testCase.success)) {
    completionMs = Date.now() - submittedAt;
    break;
  }
}
await delay(500);
const state = await evaluate(`({
  url: location.href,
  status: [...document.querySelectorAll('[role="status"]')].map((item) => item.innerText),
  submitButtons: [...document.querySelectorAll('button[type="submit"], form button')].map((button) => ({ text: button.innerText, disabled: button.disabled })),
  successVisible: document.body.innerText.toLowerCase().includes(${JSON.stringify(testCase.success)})
})`);

console.log(
  JSON.stringify(
    {
      action,
      email,
      completionMs,
      state,
      completedPosts,
      browserErrors: errors,
    },
    null,
    2,
  ),
);
socket.close();
