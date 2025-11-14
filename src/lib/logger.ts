// Centralized console logger and global error hooks
// This focuses on printing actionable error details to the browser console.

type ErrorContext = {
  message?: string;
  source?: string;
  componentStack?: string;
  info?: Record<string, unknown>;
};

export function logError(error: unknown, context: ErrorContext = {}) {
  const time = new Date().toISOString();
  const title = context.message || (error instanceof Error ? error.message : String(error));
  // Group logs for easier scanning in Chrome DevTools
  // eslint-disable-next-line no-console
  console.groupCollapsed(`❌ Error @ ${time} — ${title}`);
  // eslint-disable-next-line no-console
  console.error("Error object:", error);
  if (error instanceof Error && error.stack) {
    // eslint-disable-next-line no-console
    console.error("Stack:", error.stack);
  }
  if (context.source) {
    // eslint-disable-next-line no-console
    console.warn("Source:", context.source);
  }
  if (context.componentStack) {
    // eslint-disable-next-line no-console
    console.warn("Component Stack:", context.componentStack);
  }
  if (context.info) {
    // eslint-disable-next-line no-console
    console.info("Extra Info:", context.info);
  }
  // eslint-disable-next-line no-console
  console.groupEnd();
}

export function initGlobalErrorLogging() {
  // Handle synchronous errors not caught by React
  window.onerror = function (message, source, lineno, colno, error) {
    logError(error ?? message, {
      message: typeof message === "string" ? message : undefined,
      source: typeof source === "string" ? `${source}:${lineno}:${colno}` : undefined,
    });
    return false; // allow default logging too
  };

  // Handle unhandled promise rejections
  window.onunhandledrejection = function (event) {
    logError(event.reason ?? "Unhandled rejection", {
      message: "Unhandled Promise Rejection",
      info: { type: event.type },
    });
  };
}

// Helper to wrap async functions and auto log errors
export function withErrorLogging<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  source?: string
) {
  return async (...args: TArgs): Promise<TReturn> => {
    try {
      return await fn(...args);
    } catch (err) {
      logError(err, { source });
      throw err;
    }
  };
}

