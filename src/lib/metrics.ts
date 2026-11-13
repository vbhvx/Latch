import client from "prom-client";

export const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry, prefix: "latch_" });

export const httpRequestDuration = new client.Histogram({
  name: "latch_http_request_duration_seconds",
  help: "HTTP request latency by method, route template and status code",
  labelNames: ["method", "route", "status_code"] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [registry],
});

export const sessionsPurged = new client.Counter({
  name: "latch_sessions_purged_total",
  help: "Expired sessions deleted by the background cleanup job",
  registers: [registry],
});
