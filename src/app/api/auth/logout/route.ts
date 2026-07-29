import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/lib/auth/config";

function clearAndRedirect(request: NextRequest) {
  const response = NextResponse.redirect(
    new URL("/login", request.nextUrl.origin).toString(),
  );
  response.cookies.delete(SESSION_COOKIE);
  return response;
}

export async function POST(request: NextRequest) {
  return clearAndRedirect(request);
}

// Allow GET for a simple link-based logout too.
export async function GET(request: NextRequest) {
  return clearAndRedirect(request);
}
