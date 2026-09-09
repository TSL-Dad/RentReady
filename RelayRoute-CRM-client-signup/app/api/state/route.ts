import { apiUser } from '@/lib/auth';
import { loadState } from '@/lib/server-data';

export async function GET() {
  const user = await apiUser();
  if (!user) return Response.json({ error: 'Authentication required' }, { status: 401 });
  try {
    return Response.json(await loadState(user.userId));
  } catch (error) {
    console.error('State load failed', error instanceof Error ? error.message : 'unknown');
    return Response.json({ error: 'Could not load workspace data' }, { status: 500 });
  }
}
