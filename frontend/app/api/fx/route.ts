import { NextResponse } from "next/server";

// 브라우저(클라이언트 컴포넌트, 예: 월평균/월말 전환 버튼)는 내부 도커 네트워크의
// backend:8000을 직접 호출할 수 없으므로, 같은 오리진의 이 라우트가 서버사이드에서
// 대신 백엔드를 호출해준다.
const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const basis = searchParams.get("basis") ?? "avg";

  const res = await fetch(`${BACKEND_URL}/api/fx?basis=${basis}`, { cache: "no-store" });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
