import { NextResponse } from "next/server";
import { getFirestore, collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { getFirebaseClients } from "@/lib/firebaseClient";

export async function GET() {
  try {
    const { app } = await getFirebaseClients();
    const db = getFirestore(app);

    // 전체 로그 가져오기
    const logsRef = collection(db, "logs");
    const snapshot = await getDocs(logsRef);

    // 통계 수집
    const stats = {
      total: snapshot.size,
      byType: {} as Record<string, number>,
      byLevel: {} as Record<string, number>,
      bySource: {} as Record<string, number>,
      byDate: {} as Record<string, number>,
      recentLogs: [] as any[],
    };

    snapshot.docs.forEach((doc) => {
      const data = doc.data();

      // 타입별
      const type = data.type || "unknown";
      stats.byType[type] = (stats.byType[type] || 0) + 1;

      // 레벨별
      const level = data.level || "unknown";
      stats.byLevel[level] = (stats.byLevel[level] || 0) + 1;

      // 소스별 (generation 로그의 경우)
      if (data.payload?.source) {
        const source = data.payload.source;
        stats.bySource[source] = (stats.bySource[source] || 0) + 1;
      }

      // 날짜별
      if (data.createdAt) {
        const date = data.createdAt.toDate?.();
        if (date) {
          const dateStr = date.toISOString().split('T')[0];
          stats.byDate[dateStr] = (stats.byDate[dateStr] || 0) + 1;
        }
      }
    });

    // 최근 로그 20개 가져오기
    const recentQuery = query(
      collection(db, "logs"),
      orderBy("createdAt", "desc"),
      limit(20)
    );
    const recentSnapshot = await getDocs(recentQuery);
    stats.recentLogs = recentSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        type: data.type,
        level: data.level,
        message: data.message,
        payload: data.payload,
        createdAt: data.createdAt?.toDate?.()?.toISOString(),
      };
    });

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("로그 통계 조회 실패:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "로그 통계 조회 실패",
      },
      { status: 500 }
    );
  }
}
