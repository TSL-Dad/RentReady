import { apiUser } from '@/lib/auth';
import { getDb } from '@/db';
import { cleanSlug } from '@/lib/public-intake';

export async function POST(request: Request) {
  const user = await apiUser();
  if (!user) return Response.json({ error: 'Authentication required' }, { status: 401 });
  const body = await request.json() as Record<string, unknown>;
  const name = String(body.name ?? '').trim();
  if (!name) return Response.json({ error: 'Vendor name is required' }, { status: 400 });
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const db = getDb();
  const publicSlug=cleanSlug(body.publicSlug??name);
  await db.prepare(`INSERT INTO vendors (id,name,contact_name,phone,email,cities,public_slug,public_form_enabled,show_vendor_branding,lead_delivery_mode,max_leads_day,max_leads_week,customer_monthly_price,fulfillment_cost,recurring_revenue,priority,reliability,preferred,supports_electric,supports_gas,stairs_allowed,signup_url,tracking_url,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .bind(id,name,String(body.contactName ?? ''),String(body.phone ?? ''),String(body.email ?? ''),String(body.cities ?? ''),publicSlug,body.publicFormEnabled?1:0,body.showVendorBranding?1:0,'manual',Number(body.maxLeadsDay ?? 5),body.maxLeadsWeek ? Number(body.maxLeadsWeek) : null,Number(body.customerMonthlyPrice ?? 0),Number(body.fulfillmentCost ?? 0),Number(body.recurringRevenue ?? 0),Number(body.priority ?? 50),Number(body.reliability ?? 80),body.preferred ? 1 : 0,body.supportsElectric === false ? 0 : 1,body.supportsGas ? 1 : 0,1,String(body.signupUrl ?? ''),String(body.trackingUrl ?? ''),String(body.notes ?? ''),now,now).run();
  const zips = String(body.zips ?? '').split(/[\s,]+/).filter((zip) => /^\d{5}$/.test(zip));
  if (zips.length) await db.batch(zips.map((zip) => db.prepare('INSERT INTO vendor_service_zips (id,vendor_id,zip) VALUES (?,?,?)').bind(crypto.randomUUID(),id,zip)));
  return Response.json({ id }, { status: 201 });
}

export async function PATCH(request: Request) {
  const user = await apiUser();
  if (!user) return Response.json({ error: 'Authentication required' }, { status: 401 });
  const body = await request.json() as Record<string, unknown>;
  const vendorId = String(body.vendorId ?? '');
  const action = String(body.action ?? 'update');
  if (!vendorId) return Response.json({ error: 'Vendor is required' }, { status: 400 });
  const db = getDb();
  const now = new Date().toISOString();
  if (action === 'capacity') {
    const maxLeads = Math.max(0, Number(body.maxLeads ?? 0));
    const date = new Date().toISOString().slice(0,10);
    await db.prepare('INSERT INTO capacity_overrides (id,vendor_id,date,max_leads,note) VALUES (?,?,?,?,?) ON CONFLICT(vendor_id,date) DO UPDATE SET max_leads=excluded.max_leads,note=excluded.note').bind(crypto.randomUUID(),vendorId,date,maxLeads,String(body.note ?? 'Manual override')).run();
  } else if (action === 'requirement') {
    const name = String(body.name ?? '').trim();
    const key = String(body.key ?? name.toLowerCase().replace(/[^a-z0-9]+/g,'_')).replace(/^_|_$/g,'');
    if (!name || !key) return Response.json({ error: 'Requirement name is required' }, { status: 400 });
    await db.prepare('INSERT INTO vendor_requirements (id,vendor_id,key,name,question,description,type,required,options_json,qualifying_json,disqualifying_json,customer_label,sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)')
      .bind(crypto.randomUUID(),vendorId,key,name,String(body.question ?? ''),String(body.description ?? ''),String(body.type ?? 'boolean'),body.required === false ? 0 : 1,JSON.stringify(body.options ?? []),JSON.stringify(body.qualifying ?? []),JSON.stringify(body.disqualifying ?? []),String(body.customerLabel ?? name),Number(body.sortOrder ?? 99)).run();
  } else if (action === 'update') {
    const allowed: Record<string,string> = { name:'name',contactName:'contact_name',phone:'phone',email:'email',website:'website',cities:'cities',publicSlug:'public_slug',publicFormEnabled:'public_form_enabled',showVendorBranding:'show_vendor_branding',leadDeliveryMode:'lead_delivery_mode',maxLeadsDay:'max_leads_day',maxLeadsWeek:'max_leads_week',customerMonthlyPrice:'customer_monthly_price',fulfillmentCost:'fulfillment_cost',recurringRevenue:'recurring_revenue',oneTimeRevenue:'one_time_revenue',signupUrl:'signup_url',trackingUrl:'tracking_url',notes:'notes',priority:'priority',reliability:'reliability',active:'active',preferred:'preferred',supportsElectric:'supports_electric',supportsGas:'supports_gas' };
    const fields = body.fields as Record<string, unknown> ?? {};
    for (const [key,value] of Object.entries(fields).filter(([key]) => allowed[key])) {
      const normalized = key==='publicSlug' ? cleanSlug(value) : typeof value === 'boolean' ? Number(value) : value;
      await db.prepare(`UPDATE vendors SET ${allowed[key]}=?,updated_at=? WHERE id=?`).bind(normalized,now,vendorId).run();
    }
    if (fields.zips !== undefined) {
      const zips = String(fields.zips).split(/[\s,]+/).filter((zip) => /^\d{5}$/.test(zip));
      const statements = [db.prepare('DELETE FROM vendor_service_zips WHERE vendor_id=?').bind(vendorId),...zips.map((zip) => db.prepare('INSERT INTO vendor_service_zips (id,vendor_id,zip) VALUES (?,?,?)').bind(crypto.randomUUID(),vendorId,zip))];
      await db.batch(statements);
    }
  } else return Response.json({ error: 'Unknown action' }, { status: 400 });
  return Response.json({ ok: true });
}
