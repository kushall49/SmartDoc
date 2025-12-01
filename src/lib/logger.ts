/**
 * Logging utility for the application
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogData {
  message: string;
  level: LogLevel;
  timestamp: string;
  context?: Record<string, unknown>;
  error?: Error;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  private formatLog(data: LogData): string {
    const { timestamp, level, message, context, error } = data;
    let log = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    
    if (context) {
      log += `\nContext: ${JSON.stringify(context, null, 2)}`;
    }
    
    if (error) {
      log += `\nError: ${error.message}\nStack: ${error.stack}`;
    }
    
    return log;
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error) {
    const logData: LogData = {
      message,
      level,
      timestamp: new Date().toISOString(),
      context,
      error,
    };

    const formattedLog = this.formatLog(logData);

    switch (level) {
      case 'error':
        console.error(formattedLog);
        break;
      case 'warn':
        console.warn(formattedLog);
        break;
      case 'debug':
        if (this.isDevelopment) {
          // eslint-disable-next-line no-console
          console.log(formattedLog);
        }
        break;
      default:
        // eslint-disable-next-line no-console
        console.log(formattedLog);
    }

    // In production, you would send logs to a logging service like DataDog, LogRocket, etc.
    if (!this.isDevelopment && level === 'error') {
      // TODO: Send to external logging service
      // e.g., sendToDataDog(logData);
    }
  }

  info(message: string, context?: Record<string, unknown>) {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, unknown>) {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error, context?: Record<string, unknown>) {
    this.log('error', message, context, error);
  }

  debug(message: string, context?: Record<string, unknown>) {
    this.log('debug', message, context);
  }
}

export const logger = new Logger();
export default logger;
