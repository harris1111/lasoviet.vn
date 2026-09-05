import { toNextJsHandler } from "better-auth/next-js";

import { getAuth } from "../../../../auth/auth";

let handler: ReturnType<typeof toNextJsHandler> | undefined;

function authHandler() {
  handler ??= toNextJsHandler(getAuth());
  return handler;
}

export async function GET(request: Request) {
  return authHandler().GET(request);
}

export async function POST(request: Request) {
  return authHandler().POST(request);
}

export async function PATCH(request: Request) {
  return authHandler().PATCH(request);
}

export async function PUT(request: Request) {
  return authHandler().PUT(request);
}

export async function DELETE(request: Request) {
  return authHandler().DELETE(request);
}
