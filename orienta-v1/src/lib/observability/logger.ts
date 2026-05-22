type LogContext = Record<string, unknown>;

function toErrorDetails(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  if (typeof error === "string") {
    return { message: error };
  }

  if (error && typeof error === "object") {
    const entries = Object.entries(error);
    if (entries.length > 0) {
      return Object.fromEntries(entries);
    }
    return { error: String(error) };
  }

  return { error: error ?? "unknown_error" };
}

function generateRequestId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function ensureRequestId(context: LogContext): LogContext {
  if (context && typeof context.requestId === "string" && context.requestId.length > 0) {
    return context;
  }
  return { ...context, requestId: generateRequestId() };
}

function baseContext(context: LogContext) {
  return {
    ts: new Date().toISOString(),
    ...ensureRequestId(context),
  };
}

export function logInfo(message: string, context: LogContext = {}) {
  console.info(`[orienta-v1] ${message}`, baseContext(context));
}

export function logError(message: string, error: unknown, context: LogContext = {}) {
  console.error(`[orienta-v1] ${message}`, {
    ...baseContext(context),
    ...toErrorDetails(error),
  });
}

export function logWarn(message: string, error: unknown, context: LogContext = {}) {
  console.warn(`[orienta-v1] ${message}`, {
    ...baseContext(context),
    ...toErrorDetails(error),
  });
}
