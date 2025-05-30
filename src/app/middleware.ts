import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  // Allow all requests without restriction
  return NextResponse.next();
}

export const config = {
  matcher: ["/submitpage/:path*", "/evaluatepage/:path*"],
};
