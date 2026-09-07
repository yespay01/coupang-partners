import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

export const dynamic = "force-dynamic";

const AUTOMATION_SERVER_URL = process.env.AUTOMATION_SERVER_URL || "http://automation-server:4000";

type PageProps = { params: Promise<{ id: string }> };

async function getProductId(id: string): Promise<string | null> {
  try {
    const response = await fetch(`${AUTOMATION_SERVER_URL}/api/legacy/reviews/id/${encodeURIComponent(id)}`, { cache: "no-store" });
    if (!response.ok) return null;
    const payload = await response.json();
    return payload.success && payload.data?.productId ? String(payload.data.productId) : null;
  } catch {
    return null;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  return { title: "상품 정보로 이동 중", robots: { index: false, follow: false, nocache: true } };
}

export default async function LegacyReviewIdPage({ params }: PageProps) {
  const { id } = await params;
  const productId = await getProductId(id);
  if (!productId) notFound();
  permanentRedirect(`/products/${encodeURIComponent(productId)}`);
}
