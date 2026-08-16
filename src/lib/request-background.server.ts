import { getRequest } from "@tanstack/react-start/server";

type RequestWithWaitUntil = Request & {
  waitUntil?: (promise: Promise<unknown>) => void;
};

/**
 * Keep post-commit work attached to the runtime lifecycle without holding the
 * browser RPC open. Calls made outside a request (verification scripts, jobs)
 * still await completion so their results remain deterministic.
 */
export async function runPostResponseTask(
  task: Promise<unknown>,
  label: string,
) {
  const guardedTask = task.catch((error) => {
    console.error(`${label} failed`, {
      error: error instanceof Error ? error.message : "Unknown failure",
    });
  });

  try {
    const request = getRequest() as RequestWithWaitUntil;
    if (typeof request.waitUntil === "function") {
      request.waitUntil(guardedTask);
      return "deferred" as const;
    } else {
      // Vite's development request bridge does not expose waitUntil. The task
      // is still guarded and its email interactions are durably tracked.
      void guardedTask;
      return "deferred" as const;
    }
  } catch {
    await guardedTask;
    return "completed" as const;
  }
}
