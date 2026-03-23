import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');

  if (!process.env.REVALIDATE_SECRET || secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  revalidatePath('/', 'page');
  revalidatePath('/reviews', 'page');
  revalidatePath('/news', 'page');
  revalidatePath('/recipes', 'page');

  return NextResponse.json({
    revalidated: true,
    paths: ['/', '/reviews', '/news', '/recipes'],
    timestamp: new Date().toISOString(),
  });
}
