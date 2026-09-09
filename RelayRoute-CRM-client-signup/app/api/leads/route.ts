import { apiUser } from '@/lib/auth';
import { getDb } from '@/db';
import { approvalPlan, generateVendorHandoff } from '@/lib/routing';
import { loadState } from '@/lib/server-data';

const zipPattern = /^\d{5}(?:-\d{4})?$/;
const normalizePhone = (value: string) => value.replace(/\D/g, '');
const allowedStatuses = new Set([
  'new',
  'contacted',
  'qualifying',
  'needs_information',
  'pending_approval',
  'qualified',
  'vendor_selected',
  'sent_to_vendor',
  'signup_started',
  'signup_completed',
  'converted',
  'delivery_scheduled',
  'installed',
  'lost',
  'unqualified',
  'no_vendor_available',
  'no_response',
]);

export async function POST(request: Request) {
  const user = await apiUser();
  if (!user)
    return Response.json({ error: 'Authentication required' }, { status: 401 });
  const body = (await request.json()) as Record<string, unknown>;
  const firstName = String(body.firstName ?? '').trim();
  const lastName = String(body.lastName ?? '').trim();
  const phone = normalizePhone(String(body.phone ?? ''));
  const zip = String(body.zip ?? '').trim();
  if (!firstName)
    return Response.json({ error: 'First name is required' }, { status: 400 });
  if (phone.length < 10 || phone.length > 15)
    return Response.json(
      { error: 'Enter a valid phone number' },
      { status: 400 },
    );
  if (!zipPattern.test(zip))
    return Response.json(
      { error: 'Enter a valid US ZIP code' },
      { status: 400 },
    );
  const db = getDb();
  const max = await db
    .prepare('SELECT COALESCE(MAX(display_id), 1041) AS max_id FROM leads')
    .first<{ max_id: number }>();
  const coverage = await db
    .prepare(
      'SELECT COUNT(*) AS count FROM vendor_service_zips z JOIN vendors v ON v.id = z.vendor_id WHERE z.zip = ? AND v.active = 1',
    )
    .bind(zip.slice(0, 5))
    .first<{ count: number }>();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const status = (coverage?.count ?? 0) > 0 ? 'new' : 'no_vendor_available';
  await db.batch([
    db
      .prepare(
        `INSERT INTO leads (id,display_id,owner_user_id,source,campaign,marketplace,first_name,last_name,phone,email,zip,city,address,desired_timeframe,availability,current_appliance,notes,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      )
      .bind(
        id,
        (max?.max_id ?? 1041) + 1,
        user.userId,
        String(body.source ?? 'Facebook Messenger'),
        String(body.campaign ?? ''),
        String(body.marketplace ?? ''),
        firstName,
        lastName,
        phone,
        String(body.email ?? ''),
        zip,
        String(body.city ?? ''),
        String(body.address ?? ''),
        String(body.desiredTimeframe ?? ''),
        String(body.availability ?? ''),
        String(body.currentAppliance ?? ''),
        String(body.notes ?? ''),
        status,
        now,
        now,
      ),
    db
      .prepare(
        'INSERT INTO lead_activities (id,lead_id,actor_user_id,type,description,metadata_json,created_at) VALUES (?,?,?,?,?,?,?)',
      )
      .bind(
        crypto.randomUUID(),
        id,
        user.userId,
        'created',
        'Lead created',
        '{}',
        now,
      ),
    db
      .prepare(
        'INSERT INTO lead_activities (id,lead_id,actor_user_id,type,description,metadata_json,created_at) VALUES (?,?,?,?,?,?,?)',
      )
      .bind(
        crypto.randomUUID(),
        id,
        user.userId,
        'routing',
        status === 'no_vendor_available'
          ? `No active vendor serves ZIP ${zip.slice(0, 5)}`
          : `ZIP ${zip.slice(0, 5)} matched to active vendors`,
        '{}',
        now,
      ),
  ]);
  return Response.json(
    { id, displayId: (max?.max_id ?? 1041) + 1, status },
    { status: 201 },
  );
}

export async function PATCH(request: Request) {
  const user = await apiUser();
  if (!user)
    return Response.json({ error: 'Authentication required' }, { status: 401 });
  const body = (await request.json()) as Record<string, unknown>;
  const leadId = String(body.leadId ?? '');
  const action = String(body.action ?? '');
  if (!leadId)
    return Response.json({ error: 'Lead is required' }, { status: 400 });
  const db = getDb();
  const now = new Date().toISOString();
  if (action === 'answer') {
    const key = String(body.key ?? '').replace(/[^a-z0-9_]/gi, '');
    if (!key)
      return Response.json(
        { error: 'Requirement key is required' },
        { status: 400 },
      );
    await db.batch([
      db
        .prepare(
          'INSERT INTO lead_requirement_answers (id,lead_id,requirement_key,value_json,updated_at) VALUES (?,?,?,?,?) ON CONFLICT(lead_id,requirement_key) DO UPDATE SET value_json=excluded.value_json, updated_at=excluded.updated_at',
        )
        .bind(
          crypto.randomUUID(),
          leadId,
          key,
          JSON.stringify(body.value),
          now,
        ),
      db.prepare('UPDATE leads SET updated_at=? WHERE id=?').bind(now, leadId),
      db
        .prepare(
          'INSERT INTO lead_activities (id,lead_id,actor_user_id,type,description,metadata_json,created_at) VALUES (?,?,?,?,?,?,?)',
        )
        .bind(
          crypto.randomUUID(),
          leadId,
          user.userId,
          'qualification',
          `${String(body.label ?? key)} updated`,
          '{}',
          now,
        ),
    ]);
  } else if (action === 'recommend') {
    const vendorId = String(body.vendorId ?? '');
    const vendor = await db
      .prepare('SELECT name FROM vendors WHERE id=?')
      .bind(vendorId)
      .first<{ name: string }>();
    if (!vendor)
      return Response.json({ error: 'Vendor not found' }, { status: 404 });
    await db.batch([
      db
        .prepare(
          'UPDATE leads SET recommended_vendor_id=?,recommendation_score=?,status=?,updated_at=? WHERE id=?',
        )
        .bind(
          vendorId,
          Number(body.score ?? 0),
          'pending_approval',
          now,
          leadId,
        ),
      db
        .prepare(
          'INSERT INTO lead_activities (id,lead_id,actor_user_id,type,description,metadata_json,created_at) VALUES (?,?,?,?,?,?,?)',
        )
        .bind(
          crypto.randomUUID(),
          leadId,
          user.userId,
          'recommendation',
          `${vendor.name} manually chosen for approval`,
          JSON.stringify({ vendorId }),
          now,
        ),
    ]);
  } else if (action === 'approve') {
    const state = await loadState(user.userId);
    const lead = state.leads.find((item) => item.id === leadId);
    if (!lead)
      return Response.json({ error: 'Lead not found' }, { status: 404 });
    const requestedId = String(body.vendorId ?? lead.recommendedVendorId ?? '');
    const plan = approvalPlan(
      lead,
      requestedId,
      state.vendors,
      state.leads,
      state.settings,
    );
    const latest = plan.current;
    const manualOverride = body.manualOverride === true;
    if (!latest)
      return Response.json(
        {
          error:
            'No vendor is currently eligible. Review the routing blockers.',
        },
        { status: 409 },
      );
    if (!plan.canApprove && !(manualOverride && plan.requested?.eligible)) {
      await db.batch([
        db
          .prepare(
            'UPDATE leads SET recommended_vendor_id=?,recommendation_score=?,status=?,updated_at=? WHERE id=?',
          )
          .bind(
            latest.vendor.id,
            latest.score,
            'pending_approval',
            now,
            leadId,
          ),
        db
          .prepare(
            'INSERT INTO lead_activities (id,lead_id,actor_user_id,type,description,metadata_json,created_at) VALUES (?,?,?,?,?,?,?)',
          )
          .bind(
            crypto.randomUUID(),
            leadId,
            user.userId,
            'recommendation_changed',
            `Recommendation changed to ${latest.vendor.name} before approval`,
            JSON.stringify({
              previous: requestedId,
              current: latest.vendor.id,
            }),
            now,
          ),
      ]);
      return Response.json(
        {
          error: `Routing changed. ${latest.vendor.name} is now recommended. Review and approve again.`,
          recommendedVendorId: latest.vendor.id,
          score: latest.score,
        },
        { status: 409 },
      );
    }
    const approved =
      manualOverride && plan.requested?.eligible ? plan.requested : latest;
    const handoffId = crypto.randomUUID();
    const message = generateVendorHandoff(lead, approved.vendor);
    await db.batch([
      db
        .prepare(
          'UPDATE leads SET recommended_vendor_id=?,assigned_vendor_id=?,recommendation_score=?,expected_monthly_revenue=?,signup_url_snapshot=?,status=?,updated_at=? WHERE id=?',
        )
        .bind(
          approved.vendor.id,
          approved.vendor.id,
          approved.score,
          approved.vendor.recurringRevenue,
          approved.vendor.signupUrl,
          'vendor_selected',
          now,
          leadId,
        ),
      db
        .prepare(
          'INSERT INTO lead_handoffs (id,lead_id,vendor_id,delivery_method,status,message_snapshot,approved_at,created_at) VALUES (?,?,?,?,?,?,?,?)',
        )
        .bind(
          handoffId,
          leadId,
          approved.vendor.id,
          'manual',
          'drafted',
          message,
          now,
          now,
        ),
      db
        .prepare(
          'INSERT INTO lead_activities (id,lead_id,actor_user_id,type,description,metadata_json,created_at) VALUES (?,?,?,?,?,?,?)',
        )
        .bind(
          crypto.randomUUID(),
          leadId,
          user.userId,
          'approval',
          `${approved.vendor.name} approved${manualOverride ? ' as a manual override' : ''} and handoff message created`,
          JSON.stringify({
            vendorId: approved.vendor.id,
            handoffId,
            manualOverride,
          }),
          now,
        ),
    ]);
    return Response.json({ ok: true, handoffId });
  } else if (action === 'handoff_sent') {
    const handoffId = body.handoffId ? String(body.handoffId) : null;
    const handoff = handoffId
      ? await db
          .prepare(
            'SELECT id,vendor_id FROM lead_handoffs WHERE id=? AND lead_id=?',
          )
          .bind(handoffId, leadId)
          .first<{ id: string; vendor_id: string }>()
      : await db
          .prepare(
            "SELECT id,vendor_id FROM lead_handoffs WHERE lead_id=? AND status='drafted' ORDER BY created_at DESC LIMIT 1",
          )
          .bind(leadId)
          .first<{ id: string; vendor_id: string }>();
    if (!handoff)
      return Response.json(
        { error: 'No approved handoff message was found' },
        { status: 404 },
      );
    await db.batch([
      db
        .prepare('UPDATE lead_handoffs SET status=?,sent_at=? WHERE id=?')
        .bind('sent', now, handoff.id),
      db
        .prepare('UPDATE leads SET status=?,sent_at=?,updated_at=? WHERE id=?')
        .bind('sent_to_vendor', now, now, leadId),
      db
        .prepare(
          'INSERT INTO lead_activities (id,lead_id,actor_user_id,type,description,metadata_json,created_at) VALUES (?,?,?,?,?,?,?)',
        )
        .bind(
          crypto.randomUUID(),
          leadId,
          user.userId,
          'handoff_sent',
          'Lead marked sent to vendor',
          JSON.stringify({ handoffId: handoff.id, method: 'manual' }),
          now,
        ),
    ]);
  } else if (action === 'assign') {
    const vendorId = body.vendorId ? String(body.vendorId) : null;
    if (!vendorId) {
      await db
        .prepare(
          'UPDATE leads SET assigned_vendor_id=NULL,recommendation_score=0,expected_monthly_revenue=0,status=?,updated_at=? WHERE id=?',
        )
        .bind('new', now, leadId)
        .run();
    } else {
      const vendor = await db
        .prepare(
          'SELECT name,recurring_revenue,signup_url FROM vendors WHERE id=?',
        )
        .bind(vendorId)
        .first<{
          name: string;
          recurring_revenue: number;
          signup_url: string;
        }>();
      if (!vendor)
        return Response.json({ error: 'Vendor not found' }, { status: 404 });
      await db.batch([
        db
          .prepare(
            'UPDATE leads SET assigned_vendor_id=?,recommendation_score=?,expected_monthly_revenue=?,signup_url_snapshot=?,status=?,updated_at=? WHERE id=?',
          )
          .bind(
            vendorId,
            Number(body.score ?? 0),
            vendor.recurring_revenue,
            vendor.signup_url,
            'vendor_selected',
            now,
            leadId,
          ),
        db
          .prepare(
            'INSERT INTO lead_activities (id,lead_id,actor_user_id,type,description,metadata_json,created_at) VALUES (?,?,?,?,?,?,?)',
          )
          .bind(
            crypto.randomUUID(),
            leadId,
            user.userId,
            'assignment',
            `${vendor.name} selected`,
            JSON.stringify({ vendorId }),
            now,
          ),
      ]);
    }
  } else if (action === 'status') {
    const status = String(body.status ?? '');
    if (!allowedStatuses.has(status))
      return Response.json({ error: 'Invalid status' }, { status: 400 });
    const lead = await db
      .prepare('SELECT assigned_vendor_id FROM leads WHERE id=?')
      .bind(leadId)
      .first<{ assigned_vendor_id: string | null }>();
    const sentAt = status === 'sent_to_vendor' ? now : null;
    await db.batch([
      db
        .prepare(
          'UPDATE leads SET status=?,sent_at=COALESCE(?,sent_at),lost_reason=?,updated_at=? WHERE id=?',
        )
        .bind(status, sentAt, String(body.lostReason ?? ''), now, leadId),
      db
        .prepare(
          'INSERT INTO lead_activities (id,lead_id,actor_user_id,type,description,metadata_json,created_at) VALUES (?,?,?,?,?,?,?)',
        )
        .bind(
          crypto.randomUUID(),
          leadId,
          user.userId,
          'status',
          `Status changed to ${status.replaceAll('_', ' ')}`,
          '{}',
          now,
        ),
      db
        .prepare(
          'INSERT INTO conversion_events (id,lead_id,vendor_id,event_type,source,occurred_at,payload_json) VALUES (?,?,?,?,?,?,?)',
        )
        .bind(
          crypto.randomUUID(),
          leadId,
          lead?.assigned_vendor_id ?? null,
          status,
          'manual',
          now,
          '{}',
        ),
    ]);
  } else if (action === 'update') {
    const allowed: Record<string, string> = {
      firstName: 'first_name',
      lastName: 'last_name',
      email: 'email',
      city: 'city',
      address: 'address',
      desiredTimeframe: 'desired_timeframe',
      currentAppliance: 'current_appliance',
      notes: 'notes',
      source: 'source',
      campaign: 'campaign',
      marketplace: 'marketplace',
      paymentSetupStatus: 'payment_setup_status',
    };
    const entries = Object.entries(
      (body.fields as Record<string, unknown>) ?? {},
    ).filter(([key]) => allowed[key]);
    for (const [key, value] of entries)
      await db
        .prepare(`UPDATE leads SET ${allowed[key]}=?,updated_at=? WHERE id=?`)
        .bind(String(value ?? ''), now, leadId)
        .run();
  } else if (action === 'note') {
    const note = String(body.note ?? '').trim();
    if (!note)
      return Response.json({ error: 'Note is empty' }, { status: 400 });
    await db.batch([
      db
        .prepare(
          "UPDATE leads SET notes=CASE WHEN notes='' THEN ? ELSE notes || char(10) || ? END,updated_at=? WHERE id=?",
        )
        .bind(note, note, now, leadId),
      db
        .prepare(
          'INSERT INTO lead_activities (id,lead_id,actor_user_id,type,description,metadata_json,created_at) VALUES (?,?,?,?,?,?,?)',
        )
        .bind(
          crypto.randomUUID(),
          leadId,
          user.userId,
          'note',
          note,
          '{}',
          now,
        ),
    ]);
  } else return Response.json({ error: 'Unknown action' }, { status: 400 });
  return Response.json({ ok: true });
}
