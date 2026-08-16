const appUrl = (process.env.TEST_APP_URL || "http://127.0.0.1:8080").replace(
  /\/$/,
  "",
);
const paths = [
  "/",
  "/login",
  "/registration",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
  "/account",
];
const pages = await fetch("http://127.0.0.1:9222/json/list").then((response) =>
  response.json(),
);
const page = pages.find((item) => item.type === "page");
const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve) =>
  socket.addEventListener("open", resolve, { once: true }),
);
let id = 0;
const pending = new Map();
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (!message.id) return;
  const waiter = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) waiter.reject(new Error(message.error.message));
  else waiter.resolve(message.result);
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
    returnByValue: true,
  });
  return result.result.value;
}
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
await send("Page.enable");
await send("Runtime.enable");
const results = [];
for (const path of paths) {
  await send("Page.navigate", { url: `${appUrl}${path}` });
  await delay(1_500);
  results.push(
    await evaluate(`(() => {
      const header = document.querySelector("header");
      const logo = header?.querySelector("img");
      return {
        requestedPath: ${JSON.stringify(path)},
        renderedPath: location.pathname,
        hasNavbar: Boolean(header),
        solid: Boolean(header?.className.includes("bg-background/70")),
        transparent: Boolean(header?.className.includes("bg-transparent")),
        logo: logo?.getAttribute("src") || null,
        scrollY,
      };
    })()`),
  );
}
console.log(JSON.stringify(results, null, 2));
socket.close();
