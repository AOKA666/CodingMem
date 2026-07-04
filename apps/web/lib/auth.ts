import { NextRequest, NextResponse } from "next/server";

export function requireSyncToken(request: NextRequest): NextResponse | null {
  const expected = process.env.SYNC_API_TOKEN;
  if (!expected) {
    return NextResponse.json({ ok: false, error: "后台还没有配置 SYNC_API_TOKEN" }, { status: 500 });
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ ok: false, error: "Token 不正确，无法访问" }, { status: 401 });
  }

  return null;
}
