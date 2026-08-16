const email = process.argv[2];
const action = process.argv[3] || "registration";
const value = process.argv[4] || "";
const appUrl = (process.env.TEST_APP_URL || "http://127.0.0.1:8080").replace(
  /\/$/,
  "",
);
if (!email) throw new Error("A controlled test email is required.");

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
const events = [];
socket.addEventListener("message", (event) => {
  const payload = JSON.parse(event.data);
  if (payload.id) {
    const waiter = pending.get(payload.id);
    if (waiter) {
      pending.delete(payload.id);
      if (payload.error) waiter.reject(new Error(payload.error.message));
      else waiter.resolve(payload.result);
    }
    return;
  }
  if (
    payload.method === "Runtime.consoleAPICalled" ||
    payload.method === "Runtime.exceptionThrown"
  )
    events.push(payload);
});
function send(method, params = {}) {
  const id = nextId++;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}
const delay = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));
async function evaluate(expression) {
  const result = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails)
    throw new Error(
      result.exceptionDetails.exception?.description ||
        "Browser evaluation failed",
    );
  return result.result.value;
}

await send("Page.enable");
await send("Runtime.enable");
await send("Network.enable");
if (action.startsWith("login") || action === "forgot")
  await send("Network.clearBrowserCookies");
const path =
  action === "forgot"
    ? "/forgot-password"
    : action === "reset"
      ? value
      : action === "inspect"
        ? value
        : action.startsWith("login")
          ? "/login"
          : action.startsWith("verify") || action === "resend"
            ? value
            : "/registration";
await send("Page.navigate", { url: `${appUrl}${path}` });
await delay(3500);
events.length = 0;
const submittedAt = Date.now();

if (action === "registration") {
  await evaluate(`(() => {
    const set = (element, value) => {
      const prototype = element instanceof HTMLSelectElement
        ? HTMLSelectElement.prototype
        : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(prototype, "value").set.call(element, value);
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
    };
    const inputs = [...document.querySelectorAll("input")];
    set(inputs.find((item) => item.placeholder === "Full name"), "Phase 3.6B Browser Traveller");
    set(inputs.find((item) => item.placeholder === "Email address"), ${JSON.stringify(email)});
    set(inputs.find((item) => item.placeholder === "Contact number"), "+977 9800000000");
    set(document.querySelector("select"), "NP");
    set(inputs.find((item) => item.type === "date"), "1990-01-15");
    const passwords = inputs.filter((item) => item.type === "password");
    set(passwords[0], "Phase36BrowserA1");
    set(passwords[1], "Phase36BrowserA1");
    document.querySelector("form").requestSubmit();
    return true;
  })()`);
} else if (action === "forgot") {
  await evaluate(`(() => {
    const input = document.querySelector('input[type="email"]');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, ${JSON.stringify(email)});
    input.dispatchEvent(new Event("input", { bubbles: true }));
    document.querySelector("form").requestSubmit();
    return true;
  })()`);
} else if (action.startsWith("login")) {
  await evaluate(`(() => {
    const inputs = [...document.querySelectorAll("input")];
    const set = (element, nextValue) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(element, nextValue);
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
    };
    set(inputs.find((item) => item.type === "email"), ${JSON.stringify(email)});
    set(inputs.find((item) => item.type === "password"), ${JSON.stringify(value)});
    document.querySelector("form").requestSubmit();
    return true;
  })()`);
} else if (action === "reset") {
  const password = process.argv[5];
  await evaluate(`(() => {
    const inputs = [...document.querySelectorAll('input[type="password"]')];
    const set = (element, nextValue) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(element, nextValue);
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
    };
    set(inputs[0], ${JSON.stringify(password)});
    set(inputs[1], ${JSON.stringify(password)});
    document.querySelector("form").requestSubmit();
    return true;
  })()`);
} else if (action === "resend") {
  await evaluate(`(() => {
    [...document.querySelectorAll("button")].find((button) => button.innerText.includes("Resend"))?.click();
    return true;
  })()`);
} else if (action.startsWith("verify")) {
  const code = action === "verify_wrong" ? "111111" : process.argv[5];
  await evaluate(`(() => {
    const input = document.querySelector('input[inputmode="numeric"]');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, ${JSON.stringify(code)});
    input.dispatchEvent(new Event("input", { bubbles: true }));
    document.querySelector("form").requestSubmit();
    return true;
  })()`);
}
let completionMs = null;
for (let attempt = 0; attempt < 120; attempt += 1) {
  await delay(100);
  const completion = await evaluate(`({
    path: location.pathname,
    text: document.body.innerText,
    button: document.querySelector('button[type="submit"], form button')?.innerText || ""
  })`);
  const complete =
    (action === "registration" && completion.path === "/verify-email") ||
    (action === "forgot" &&
      (completion.text.includes("sent password reset instructions") ||
        completion.text.includes("couldn't find an account") ||
        completion.text.includes("awaiting email verification"))) ||
    (action.startsWith("verify") &&
      (completion.path === "/account" ||
        completion.text.includes("Incorrect verification code") ||
        completion.text.includes("expired"))) ||
    (action === "resend" && completion.text.includes("verification code"));
  if (complete) {
    completionMs = Date.now() - submittedAt;
    break;
  }
}
await delay(1000);
const state = await evaluate(`({
  url: location.href,
  text: document.body.innerText,
  button: document.querySelector('button[type="submit"], form button')?.innerText || "",
  alert: document.querySelector('[role="alert"]')?.innerText || ""
})`);
console.log(
  JSON.stringify(
    {
      action,
      email,
      completionMs,
      state,
      browserErrors: events
        .filter((event) => event.method === "Runtime.exceptionThrown")
        .map(
          (event) =>
            event.params.exceptionDetails.exception?.description ||
            event.params.exceptionDetails.text,
        ),
    },
    null,
    2,
  ),
);
socket.close();
