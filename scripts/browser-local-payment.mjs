const checkout = process.argv[2];
const cardNumber = process.argv[3] || "4242424242424242";
const appUrl = (process.env.TEST_APP_URL || "http://127.0.0.1:8080").replace(
  /\/$/,
  "",
);
if (!checkout) throw new Error("Checkout reference is required.");
const pages = await fetch("http://127.0.0.1:9222/json/list").then((response) =>
  response.json(),
);
const page = pages.find((item) => item.type === "page");
if (!page?.webSocketDebuggerUrl) throw new Error("Chrome page unavailable.");
const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});
let id = 0;
const pending = new Map();
const posts = [];
const errors = [];
const requests = new Map();
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id) {
    const waiter = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) waiter.reject(new Error(message.error.message));
    else waiter.resolve(message.result);
  } else if (message.method === "Runtime.exceptionThrown") {
    errors.push(message.params.exceptionDetails.text);
  } else if (message.method === "Runtime.consoleAPICalled") {
    if (message.params.type === "error")
      errors.push(
        message.params.args
          .map((argument) => argument.description || argument.value || "")
          .join(" "),
      );
  } else if (message.method === "Network.requestWillBeSent") {
    if (message.params.request.method === "POST")
      requests.set(message.params.requestId, {
        url: message.params.request.url,
        start: message.params.timestamp,
      });
  } else if (message.method === "Network.responseReceived") {
    const request = requests.get(message.params.requestId);
    if (request) request.status = message.params.response.status;
  } else if (message.method === "Network.loadingFinished") {
    const request = requests.get(message.params.requestId);
    if (request) {
      posts.push({
        url: request.url,
        status: request.status,
        durationMs: Math.round(
          (message.params.timestamp - request.start) * 1000,
        ),
      });
      requests.delete(message.params.requestId);
    }
  }
});
function send(method, params = {}) {
  const callId = ++id;
  socket.send(JSON.stringify({ id: callId, method, params }));
  return new Promise((resolve, reject) =>
    pending.set(callId, { resolve, reject }),
  );
}
async function evaluate(expression) {
  const result = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails)
    throw new Error(result.exceptionDetails.exception?.description);
  return result.result.value;
}
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function navigate(url) {
  await send("Page.navigate", { url });
  await delay(2_000);
}
await send("Page.enable");
await send("Runtime.enable");
await send("Network.enable");
await navigate(`${appUrl}/login`);
if ((await evaluate("location.pathname")) === "/login") {
  await evaluate(`(() => {
    const set = (input, value) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    };
    const inputs = document.querySelectorAll("form input");
    set(inputs[0], "phase-local-payment@example.test");
    set(inputs[1], "PhaseLocalPaymentA1");
    inputs[0].closest("form").requestSubmit();
  })()`);
  for (let attempt = 0; attempt < 50; attempt += 1) {
    await delay(100);
    if ((await evaluate("location.pathname")) === "/account") break;
  }
}
await navigate(
  `${appUrl}/booking/payment?checkout=${encodeURIComponent(checkout)}`,
);
for (let attempt = 0; attempt < 80; attempt += 1) {
  if (await evaluate("document.body.innerText.includes('mock card')")) break;
  await delay(100);
}
const navbarBefore = await evaluate(`(() => {
  const header = document.querySelector("header");
  return header ? { className: header.className, background: getComputedStyle(header).backgroundColor } : null;
})()`);
posts.length = 0;
errors.length = 0;
await evaluate(`(() => {
  const set = (input, value) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  };
  const form = [...document.querySelectorAll("form")].find((item) => item.innerText.includes("mock card"));
  if (!form) return false;
  const inputs = form.querySelectorAll("input");
  ["Local Payment Traveller", ${JSON.stringify(cardNumber)}, "12/30", "123"].forEach((value, index) => set(inputs[index], value));
  form.requestSubmit();
  return true;
})()`);
if (!(await evaluate("document.body.innerText.includes('mock card')"))) {
  console.log(
    JSON.stringify(
      {
        checkout,
        outcome: "page_error",
        finalUrl: await evaluate("location.href"),
        body: await evaluate("document.body.innerText"),
        consoleErrors: errors,
      },
      null,
      2,
    ),
  );
  socket.close();
  process.exit(1);
}
let processingSeen = false;
let outcome = "timeout";
for (let attempt = 0; attempt < 200; attempt += 1) {
  await delay(25);
  const state = await evaluate(
    `({ path: location.pathname, body: document.body.innerText })`,
  );
  if (state.body.includes("Processing Payment")) processingSeen = true;
  if (state.path === "/booking/success") {
    outcome = "confirmed";
    break;
  }
  if (state.body.includes("declined")) {
    outcome = "declined";
    break;
  }
}
await delay(300);
console.log(
  JSON.stringify(
    {
      checkout,
      card: cardNumber === "4000000000000002" ? "decline" : "success",
      processingSeen,
      outcome,
      finalUrl: await evaluate("location.href"),
      confirmedVisible: await evaluate(
        `document.body.innerText.includes("Booking confirmed")`,
      ),
      navbarBefore,
      posts,
      consoleErrors: errors,
    },
    null,
    2,
  ),
);
socket.close();
