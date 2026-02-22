export function getRequestId(req: Request) {
  return req.headers.get("x-request-id") || crypto.randomUUID();
}

type LogArgs = {
  requestId: string;
  route: string;
  method: string;
  storeId?: string;
  status?: number;
  message: string;
};

export function logApiEvent(args: LogArgs) {
  const payload = {
    level: "info",
    ts: new Date().toISOString(),
    requestId: args.requestId,
    route: args.route,
    method: args.method,
    storeId: args.storeId || null,
    status: args.status ?? null,
    message: args.message
  };

  console.log(JSON.stringify(payload));
}
