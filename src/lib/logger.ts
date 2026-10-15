import {
  configureSync,
  defaultConsoleFormatter,
  getConsoleSink,
  getLogfmtFormatter,
  getLogger as getLogTapeLogger,
  type Logger,
  type LogRecord,
} from "@logtape/logtape";

const APP = "ds-webapp";

export function getLogger(...category: string[]): Logger {
  return getLogTapeLogger([APP, ...category]);
}

const SENSITIVE = /[^\s@"'<>]+@[^\s@"'<>]+\.[^\s@"'<>]+|\d{8,}/g;

export function errorInfo(error: unknown): Record<string, string | number> {
  if (error === null || typeof error !== "object") {
    return { errorMessage: String(error).replace(SENSITIVE, "[redacted]") };
  }
  const e = error as Record<string, unknown>;
  const info: Record<string, string | number> = {};
  if (typeof e.name === "string") info.errorName = e.name;
  if (typeof e.code === "string" || typeof e.code === "number")
    info.errorCode = e.code;
  if (typeof e.status === "number") info.status = e.status;
  if (typeof e.message === "string")
    info.errorMessage = e.message
      .replace(SENSITIVE, "[redacted]")
      .slice(0, 300);
  return info;
}

function browserFormatter(record: LogRecord): readonly unknown[] {
  const args = defaultConsoleFormatter(record);
  return Object.keys(record.properties).length > 0
    ? [...args, record.properties]
    : args;
}

export function configureLogging() {
  const browser = typeof window !== "undefined";
  configureSync({
    reset: true,
    sinks: {
      console: getConsoleSink({
        formatter: browser ? browserFormatter : getLogfmtFormatter(),
      }),
    },
    loggers: [
      {
        category: [APP],
        lowestLevel: process.env.NODE_ENV === "production" ? "info" : "debug",
        sinks: ["console"],
      },
      {
        category: ["logtape", "meta"],
        lowestLevel: "warning",
        sinks: ["console"],
      },
    ],
  });
}
