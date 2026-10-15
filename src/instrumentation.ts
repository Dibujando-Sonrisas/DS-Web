import type { Instrumentation } from "next";
import { configureLogging, errorInfo, getLogger } from "@/lib/logger";

export function register() {
  configureLogging();
}

export const onRequestError: Instrumentation.onRequestError = (
  error,
  request,
  context
) => {
  const digest =
    error && typeof error === "object" && "digest" in error
      ? String(error.digest)
      : undefined;
  getLogger("next").error("Unhandled request error", {
    ...errorInfo(error),
    digest,
    method: request.method,
    path: request.path.split("?")[0],
    routeType: context.routeType,
  });
};
