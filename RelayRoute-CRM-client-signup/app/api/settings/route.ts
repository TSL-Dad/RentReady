import { apiUser } from '@/lib/auth';
import { getDb } from '@/db';

export async function PATCH(request: Request) {
  const user = await apiUser();
  if (!user) return Response.json({ error: 'Authentication required' }, { status: 401 });
  const body = await request.json() as Record<string, unknown>;
  const values = ['capacityWeight','priorityWeight','revenueWeight','conversionWeight','reliabilityWeight','preferredWeight'].map((key) => Math.max(0,Number(body[key] ?? 0)));
  if (values.reduce((sum,value) => sum+value,0) <= 0) return Response.json({ error: 'At least one weight must be positive' }, { status: 400 });
  await getDb().prepare('UPDATE routing_settings SET capacity_weight=?,priority_weight=?,revenue_weight=?,conversion_weight=?,reliability_weight=?,preferred_weight=?,updated_at=? WHERE id=?').bind(...values,new Date().toISOString(),'default').run();
  return Response.json({ ok:true });
}
