import { NextResponse } from "next/server";

export async function GET() {
  // 설정은 클라이언트에서 직접 Firestore를 조회하므로
  // 이 API는 서버사이드 조회가 필요한 경우 사용
  return NextResponse.json({
    message: "설정은 클라이언트에서 Firestore를 통해 직접 조회합니다.",
  });
}

export async function POST() {
  // 설정 저장도 클라이언트에서 직접 Firestore에 저장
  return NextResponse.json({
    message: "설정은 클라이언트에서 Firestore를 통해 직접 저장합니다.",
  });
}
