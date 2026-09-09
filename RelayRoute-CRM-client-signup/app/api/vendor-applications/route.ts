import { apiUser } from '@/lib/auth';
import { getDb } from '@/db';
import {
  cleanSlug,
  normalizeApplicationRequirement,
  validateVendorApplication,
} from '@/lib/public-intake';

const parse = <T>(value: string, fallback: T): T => {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

export async function PATCH(request: Request) {
  const user = await apiUser();
  if (!user)
    return Response.json({ error: 'Authentication required' }, { status: 401 });
  const body = (await request.json()) as Record<string, unknown>;
  const applicationId = String(body.applicationId ?? '');
  const action = String(body.action ?? '');
  if (!applicationId)
    return Response.json({ error: 'Application is required' }, { status: 400 });
  const db = getDb();
  const now = new Date().toISOString();
  const row = await db
    .prepare('SELECT * FROM vendor_applications WHERE id=?')
    .bind(applicationId)
    .first<Record<string, unknown>>();
  if (!row)
    return Response.json({ error: 'Application not found' }, { status: 404 });
  if (action === 'reject') {
    await db
      .prepare(
        'UPDATE vendor_applications SET status=?,reviewed_at=?,reviewed_by=? WHERE id=?',
      )
      .bind('rejected', now, user.userId, applicationId)
      .run();
    return Response.json({ ok: true });
  }
  if (action === 'update') {
    const current = {
      ...parse<Record<string, unknown>>(String(row.data_json), {}),
      requirements: parse(String(row.requirements_json), []),
      companyName: String(row.company_name),
      contactName: String(row.contact_name),
      phone: String(row.phone),
      email: String(row.email),
      website: String(row.website),
      primaryMarket: String(row.primary_market),
    };
    const validated = validateVendorApplication({
      ...current,
      ...(body.fields as Record<string, unknown>),
    });
    if (!validated.ok)
      return Response.json({ error: validated.error }, { status: 400 });
    const { requirements, ...data } = validated.value;
    await db
      .prepare(
        'UPDATE vendor_applications SET company_name=?,contact_name=?,phone=?,email=?,website=?,primary_market=?,data_json=?,requirements_json=? WHERE id=?',
      )
      .bind(
        data.companyName,
        data.contactName,
        data.phone,
        data.email,
        data.website,
        data.primaryMarket,
        JSON.stringify(data),
        JSON.stringify(requirements),
        applicationId,
      )
      .run();
    return Response.json({ ok: true });
  }
  if (action !== 'approve')
    return Response.json({ error: 'Unknown action' }, { status: 400 });
  if (String(row.status) === 'approved')
    return Response.json(
      { error: 'Application is already approved' },
      { status: 409 },
    );
  const data = parse<Record<string, unknown>>(String(row.data_json), {});
  const requirements = parse<Record<string, unknown>[]>(
    String(row.requirements_json),
    [],
  );
  const vendorId = crypto.randomUUID();
  const baseSlug = cleanSlug(row.company_name) || 'vendor';
  let publicSlug = baseSlug;
  const taken = await db
    .prepare('SELECT id FROM vendors WHERE public_slug=?')
    .bind(publicSlug)
    .first();
  if (taken) publicSlug = `${baseSlug}-${vendorId.slice(0, 6)}`;
  const zips = Array.isArray(data.zips)
    ? data.zips.map(String).filter((zip) => /^\d{5}$/.test(zip))
    : [];
  const statements = [
    db
      .prepare(
        `INSERT INTO vendors (id,name,contact_name,phone,email,website,public_slug,public_form_enabled,show_vendor_branding,lead_delivery_mode,active,preferred,cities,max_leads_day,max_leads_week,customer_monthly_price,delivery_fee,installation_fee,deposit_amount,minimum_term_months,supports_electric,supports_gas,stackable_available,stairs_allowed,max_flights,one_time_revenue,recurring_revenue,revenue_model,notes,priority,reliability,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      )
      .bind(
        vendorId,
        String(row.company_name),
        String(row.contact_name),
        String(row.phone),
        String(row.email),
        String(row.website),
        publicSlug,
        0,
        0,
        'manual',
        1,
        0,
        String(data.cities ?? data.primaryMarket ?? ''),
        Number(data.maxLeadsDay ?? 5),
        Number(data.maxLeadsWeek ?? 0) || null,
        Number(data.customerMonthlyPrice ?? 0),
        Number(data.deliveryFee ?? 0),
        Number(data.installationFee ?? 0),
        Number(data.depositAmount ?? 0),
        Number(data.minimumTermMonths ?? 0) || null,
        data.supportsElectric === false ? 0 : 1,
        data.supportsGas === true ? 1 : 0,
        data.stackableAvailable === true ? 1 : 0,
        data.stairsAllowed === false ? 0 : 1,
        Number(data.maxFlights ?? 0) || null,
        Number(data.oneTimeRevenue ?? 0),
        Number(data.recurringRevenue ?? 0),
        String(data.revenueModel ?? 'recurring'),
        String(data.paymentNotes ?? ''),
        50,
        80,
        now,
        now,
      ),
    ...zips.map((zip) =>
      db
        .prepare(
          'INSERT INTO vendor_service_zips (id,vendor_id,zip) VALUES (?,?,?)',
        )
        .bind(crypto.randomUUID(), vendorId, zip),
    ),
    ...requirements.map((rawRequirement, index) => {
      const requirement = normalizeApplicationRequirement(
        rawRequirement as never,
      );
      const name = String(requirement.name ?? `Requirement ${index + 1}`);
      const key = `${cleanSlug(name).replaceAll('-', '_') || 'requirement'}_${index + 1}`;
      return db
        .prepare(
          'INSERT INTO vendor_requirements (id,vendor_id,key,name,question,description,type,required,options_json,qualifying_json,disqualifying_json,customer_label,sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
        )
        .bind(
          crypto.randomUUID(),
          vendorId,
          key,
          name,
          String(requirement.question ?? name),
          String(requirement.description ?? ''),
          String(requirement.type ?? 'boolean'),
          requirement.required === false ? 0 : 1,
          JSON.stringify(requirement.options ?? []),
          JSON.stringify(requirement.qualifying ?? []),
          JSON.stringify(requirement.disqualifying ?? []),
          name,
          index,
        );
    }),
    db
      .prepare(
        'UPDATE vendor_applications SET status=?,reviewed_at=?,reviewed_by=?,created_vendor_id=? WHERE id=?',
      )
      .bind('approved', now, user.userId, vendorId, applicationId),
  ];
  await db.batch(statements);
  return Response.json({ ok: true, vendorId });
}
