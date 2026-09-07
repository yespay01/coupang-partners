import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

export const dynamic = "force-dynamic";

const AUTOMATION_SERVER_URL = process.env.AUTOMATION_SERVER_URL || "http://automation-server:4000";

type PageProps = { params: Promise<{ slug: string }> };

async function getProductId(slug: string): Promise<string | null> {
  try {
    let decodedSlug = slug;
    try { decodedSlug = decodeURIComponent(slug); } catch {}
    const url = new URL(`${AUTOMATION_SERVER_URL}/api/legacy/reviews/by-slug`);
    url.searchParams.set("slug", decodedSlug);
    const response = await fetch(url.toString(), { cache: "no-store" });
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

export default async function LegacyReviewSlugPage({ params }: PageProps) {
  const { slug } = await params;
  const productId = await getProductId(slug);
  if (!productId) notFound();
  permanentRedirect(`/products/${encodeURIComponent(productId)}`);
}
