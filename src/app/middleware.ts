import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(_req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req: _req, res });
  await supabase.auth.getSession();
  return res;
}

export const config = {
  matcher: ["/submitpage/:path*", "/evaluatepage/:path*"],
};
