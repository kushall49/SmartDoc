type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type LogContext = Record<string, unknown>;

function toLogContext(ctx?: LogContext | Error | unknown): LogContext | undefined {
  if (ctx === undefined) return undefined;
  if (ctx instanceof Error) {
    return {
      message: ctx.message,
      name: ctx.name,
      ...(ctx.stack ? { stack: ctx.stack } : {}),
    };
  }
  if (typeof ctx === 'object' && ctx !== null && !Array.isArray(ctx)) {
    return ctx as LogContext;
  }
  return { detail: String(ctx) };
}

function mergeContexts(
  a?: LogContext | Error | unknown,
  b?: LogContext
): LogContext | undefined {
  const first = toLogContext(a);
  if (!first && !b) return undefined;
  return { ...first, ...b };
}

function log(level: LogLevel, message: string, context?: LogContext) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(context && { context }),
  };
  if (process.env.NODE_ENV === 'production') {
    console[level](JSON.stringify(entry));
  } else {
    const colors: Record<LogLevel, string> = {
      debug: '\x1b[37m',
      info: '\x1b[36m',
      warn: '\x1b[33m',
      error: '\x1b[31m',
    };
    console[level](
      `${colors[level]}[${level.toUpperCase()}]\x1b[0m ${message}`,
      context ?? ''
    );
  }
}

export const logger = {
  debug: (msg: string, ctx?: LogContext) => log('debug', msg, ctx),
  info: (msg: string, ctx?: LogContext) => log('info', msg, ctx),
  warn: (msg: string, ctx?: LogContext | Error | unknown, extra?: LogContext) =>
    log('warn', msg, mergeContexts(ctx, extra)),
  error: (msg: string, ctx?: LogContext | Error | unknown, extra?: LogContext) =>
    log('error', msg, mergeContexts(ctx, extra)),
};
