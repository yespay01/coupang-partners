import { NextResponse } from "next/server";
import { getFirestore, collection, query, where, getDocs, deleteDoc, writeBatch, limit } from "firebase/firestore";
import { getFirebaseClients } from "@/lib/firebaseClient";

export async function POST(request: Request) {
  try {
    const { app } = await getFirebaseClients();
    const db = getFirestore(app);

    const body = await request.json();
    const { type = "generation", level = "error" } = body;

    // 삭제할 로그 쿼리
    const logsRef = collection(db, "logs");
    let q = query(logsRef);

    // 타입 필터
    if (type) {
      q = query(q, where("type", "==", type));
    }

    // 레벨 필터
    if (level) {
      q = query(q, where("level", "==", level));
    }

    const snapshot = await getDocs(q);
    console.log(`삭제할 로그 개수: ${snapshot.size}`);

    // 배치 삭제 (한 번에 500개씩)
    const batchSize = 500;
    let deletedCount = 0;

    for (let i = 0; i < snapshot.docs.length; i += batchSize) {
      const batch = writeBatch(db);
      const batchDocs = snapshot.docs.slice(i, i + batchSize);

      batchDocs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      deletedCount += batchDocs.length;

      console.log(`진행: ${deletedCount}/${snapshot.size}`);
    }

    return NextResponse.json({
      success: true,
      message: `${deletedCount}개의 로그를 삭제했습니다.`,
      deletedCount,
    });
  } catch (error) {
    console.error("로그 삭제 실패:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "로그 삭제 실패",
      },
      { status: 500 }
    );
  }
}
