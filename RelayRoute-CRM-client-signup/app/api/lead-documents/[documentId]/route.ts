import { apiUser } from '@/lib/auth';
import { getDb, getUploads } from '@/db';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ documentId: string }> },
) {
  const user = await apiUser();
  if (!user)
    return Response.json({ error: 'Authentication required' }, { status: 401 });
  const { documentId } = await params;
  const document = await getDb()
    .prepare(
      'SELECT original_name,object_key,content_type FROM lead_documents WHERE id=?',
    )
    .bind(documentId)
    .first<{
      original_name: string;
      object_key: string;
      content_type: string;
    }>();
  if (!document)
    return Response.json({ error: 'Document not found' }, { status: 404 });
  const object = await getUploads().get(document.object_key);
  if (!object)
    return Response.json({ error: 'Document file not found' }, { status: 404 });
  const filename = document.original_name.replace(/[\r\n"]/g, '_');
  return new Response(object.body, {
    headers: {
      'Content-Type': document.content_type || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
