import { NextResponse } from "next/server";
import { getFirestore, collection, getDocs, deleteDoc } from "firebase/firestore";
import { getFirebaseClients } from "@/lib/firebaseClient";

export async function POST() {
  try {
    const { app } = await getFirebaseClients();
    const db = getFirestore(app);

    // review_retry_queue 컬렉션의 모든 문서 가져오기
    const retryQueueRef = collection(db, "review_retry_queue");
    const snapshot = await getDocs(retryQueueRef);

    console.log(`재시도 큐 문서 개수: ${snapshot.size}`);

    // 모든 문서 삭제
    const deletePromises = snapshot.docs.map((doc) => deleteDoc(doc.ref));
    await Promise.all(deletePromises);

    return NextResponse.json({
      success: true,
      message: `${snapshot.size}개의 재시도 작업을 중단했습니다.`,
      deletedCount: snapshot.size,
    });
  } catch (error) {
    console.error("재시도 중단 실패:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "재시도 중단 실패",
      },
      { status: 500 }
    );
  }
}
