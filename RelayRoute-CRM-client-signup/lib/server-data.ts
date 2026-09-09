import { getDb } from '@/db';
import { seedIfEmpty } from '@/lib/seed';
import type {
  AppState,
  Lead,
  LeadDocument,
  LeadHandoff,
  Requirement,
  Vendor,
  VendorApplication,
} from '@/lib/types';

const bool = (value: unknown) => Boolean(value);
const json = <T>(value: unknown, fallback: T): T => {
  try {
    return JSON.parse(String(value)) as T;
  } catch {
    return fallback;
  }
};

export async function loadState(ownerUserId: string): Promise<AppState> {
  const db = getDb();
  await seedIfEmpty(db, ownerUserId);
  const [
    vendorRows,
    zipRows,
    requirementRows,
    overrideRows,
    leadRows,
    answerRows,
    documentRows,
    activityRows,
    handoffRows,
    applicationRows,
    settingRow,
  ] = await Promise.all([
    db
      .prepare(
        'SELECT * FROM vendors ORDER BY preferred DESC, priority DESC, name',
      )
      .all<Record<string, unknown>>(),
    db
      .prepare('SELECT vendor_id, zip FROM vendor_service_zips ORDER BY zip')
      .all<Record<string, unknown>>(),
    db
      .prepare(
        'SELECT * FROM vendor_requirements ORDER BY vendor_id, sort_order, name',
      )
      .all<Record<string, unknown>>(),
    db
      .prepare(
        'SELECT vendor_id, max_leads FROM capacity_overrides WHERE date = ?',
      )
      .bind(new Date().toISOString().slice(0, 10))
      .all<Record<string, unknown>>(),
    db
      .prepare('SELECT * FROM leads ORDER BY created_at DESC')
      .all<Record<string, unknown>>(),
    db
      .prepare(
        'SELECT lead_id, requirement_key, value_json FROM lead_requirement_answers',
      )
      .all<Record<string, unknown>>(),
    db
      .prepare(
        'SELECT id, lead_id, kind, original_name, content_type, size, created_at FROM lead_documents ORDER BY created_at',
      )
      .all<Record<string, unknown>>(),
    db
      .prepare(
        'SELECT id, lead_id, type, description, created_at FROM lead_activities ORDER BY created_at DESC',
      )
      .all<Record<string, unknown>>(),
    db
      .prepare('SELECT * FROM lead_handoffs ORDER BY created_at DESC')
      .all<Record<string, unknown>>(),
    db
      .prepare('SELECT * FROM vendor_applications ORDER BY submitted_at DESC')
      .all<Record<string, unknown>>(),
    db
      .prepare('SELECT * FROM routing_settings WHERE id = ?')
      .bind('default')
      .first<Record<string, unknown>>(),
  ]);
  const zips = new Map<string, string[]>();
  zipRows.results.forEach((row) =>
    zips.set(String(row.vendor_id), [
      ...(zips.get(String(row.vendor_id)) ?? []),
      String(row.zip),
    ]),
  );
  const requirements = new Map<string, Requirement[]>();
  requirementRows.results.forEach((row) => {
    const requirement: Requirement = {
      id: String(row.id),
      vendorId: String(row.vendor_id),
      key: String(row.key),
      name: String(row.name),
      question: String(row.question),
      description: String(row.description ?? ''),
      type: String(row.type) as Requirement['type'],
      required: bool(row.required),
      options: json(row.options_json, []),
      qualifying: json(row.qualifying_json, []),
      disqualifying: json(row.disqualifying_json, []),
      customerLabel: String(row.customer_label ?? ''),
      sortOrder: Number(row.sort_order ?? 0),
    };
    requirements.set(requirement.vendorId, [
      ...(requirements.get(requirement.vendorId) ?? []),
      requirement,
    ]);
  });
  const overrides = new Map(
    overrideRows.results.map((row) => [
      String(row.vendor_id),
      Number(row.max_leads),
    ]),
  );
  const vendors: Vendor[] = vendorRows.results.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    contactName: String(row.contact_name ?? ''),
    phone: String(row.phone ?? ''),
    email: String(row.email ?? ''),
    publicSlug: String(row.public_slug ?? ''),
    publicFormEnabled: bool(row.public_form_enabled),
    showVendorBranding: bool(row.show_vendor_branding),
    leadDeliveryMode: String(
      row.lead_delivery_mode ?? 'manual',
    ) as Vendor['leadDeliveryMode'],
    website: String(row.website ?? ''),
    active: bool(row.active),
    preferred: bool(row.preferred),
    cities: String(row.cities ?? ''),
    maxLeadsDay: Number(row.max_leads_day),
    maxLeadsWeek:
      row.max_leads_week == null ? null : Number(row.max_leads_week),
    customerMonthlyPrice: Number(row.customer_monthly_price),
    fulfillmentCost: Number(row.fulfillment_cost),
    oneTimeRevenue: Number(row.one_time_revenue),
    recurringRevenue: Number(row.recurring_revenue),
    commissionPercent: Number(row.commission_percent),
    revenueModel: String(row.revenue_model),
    minimumTermMonths:
      row.minimum_term_months == null ? null : Number(row.minimum_term_months),
    depositAmount: Number(row.deposit_amount),
    deliveryFee: Number(row.delivery_fee),
    installationFee: Number(row.installation_fee),
    supportsElectric: bool(row.supports_electric),
    supportsGas: bool(row.supports_gas),
    stackableAvailable: bool(row.stackable_available),
    stairsAllowed: bool(row.stairs_allowed),
    maxFlights: row.max_flights == null ? null : Number(row.max_flights),
    signupUrl: String(row.signup_url ?? ''),
    trackingUrl: String(row.tracking_url ?? ''),
    notes: String(row.notes ?? ''),
    priority: Number(row.priority),
    reliability: Number(row.reliability),
    conversionRate: Number(row.conversion_rate),
    partnershipStarted: String(row.partnership_started ?? ''),
    zips: zips.get(String(row.id)) ?? [],
    requirements: requirements.get(String(row.id)) ?? [],
    todayOverride: overrides.get(String(row.id)) ?? null,
  }));
  const answers = new Map<string, Record<string, unknown>>();
  answerRows.results.forEach((row) =>
    answers.set(String(row.lead_id), {
      ...(answers.get(String(row.lead_id)) ?? {}),
      [String(row.requirement_key)]: json(row.value_json, null),
    }),
  );
  const documents = new Map<string, LeadDocument[]>();
  documentRows.results.forEach((row) => {
    const document: LeadDocument = {
      id: String(row.id),
      leadId: String(row.lead_id),
      kind: String(row.kind) as LeadDocument['kind'],
      originalName: String(row.original_name),
      contentType: String(row.content_type),
      size: Number(row.size),
      createdAt: String(row.created_at),
    };
    documents.set(document.leadId, [
      ...(documents.get(document.leadId) ?? []),
      document,
    ]);
  });
  const activities = new Map<string, Lead['activities']>();
  activityRows.results.forEach((row) =>
    activities.set(String(row.lead_id), [
      ...(activities.get(String(row.lead_id)) ?? []),
      {
        id: String(row.id),
        type: String(row.type),
        description: String(row.description),
        createdAt: String(row.created_at),
      },
    ]),
  );
  const handoffs = new Map<string, LeadHandoff[]>();
  handoffRows.results.forEach((row) => {
    const handoff: LeadHandoff = {
      id: String(row.id),
      leadId: String(row.lead_id),
      vendorId: String(row.vendor_id),
      deliveryMethod: String(
        row.delivery_method,
      ) as LeadHandoff['deliveryMethod'],
      status: String(row.status) as LeadHandoff['status'],
      messageSnapshot: String(row.message_snapshot),
      approvedAt: String(row.approved_at),
      sentAt: row.sent_at ? String(row.sent_at) : null,
      createdAt: String(row.created_at),
    };
    handoffs.set(handoff.leadId, [
      ...(handoffs.get(handoff.leadId) ?? []),
      handoff,
    ]);
  });
  const leads: Lead[] = leadRows.results.map((row) => ({
    id: String(row.id),
    displayId: Number(row.display_id),
    source: String(row.source),
    campaign: String(row.campaign),
    marketplace: String(row.marketplace),
    firstName: String(row.first_name),
    lastName: String(row.last_name),
    phone: String(row.phone),
    email: String(row.email),
    zip: String(row.zip),
    city: String(row.city),
    address: String(row.address),
    desiredTimeframe: String(row.desired_timeframe),
    availability: String(row.availability ?? ''),
    currentAppliance: String(row.current_appliance),
    notes: String(row.notes),
    landingVendorId: row.landing_vendor_id
      ? String(row.landing_vendor_id)
      : null,
    landingVendorSlug: String(row.landing_vendor_slug ?? ''),
    recommendedVendorId: row.recommended_vendor_id
      ? String(row.recommended_vendor_id)
      : null,
    publicSubmission: bool(row.public_submission),
    landingPage: String(row.landing_page ?? ''),
    utmSource: String(row.utm_source ?? ''),
    utmMedium: String(row.utm_medium ?? ''),
    utmCampaign: String(row.utm_campaign ?? ''),
    utmContent: String(row.utm_content ?? ''),
    utmTerm: String(row.utm_term ?? ''),
    fbclid: String(row.fbclid ?? ''),
    contactConsentAt: row.contact_consent_at
      ? String(row.contact_consent_at)
      : null,
    possibleDuplicateOf: row.possible_duplicate_of
      ? String(row.possible_duplicate_of)
      : null,
    assignedVendorId: row.assigned_vendor_id
      ? String(row.assigned_vendor_id)
      : null,
    recommendationScore: Number(row.recommendation_score),
    sentAt: row.sent_at ? String(row.sent_at) : null,
    signupUrlSnapshot: row.signup_url_snapshot
      ? String(row.signup_url_snapshot)
      : null,
    paymentSetupStatus: String(row.payment_setup_status),
    status: String(row.status),
    lostReason: String(row.lost_reason),
    expectedMonthlyRevenue: Number(row.expected_monthly_revenue),
    actualMonthlyRevenue:
      row.actual_monthly_revenue == null
        ? null
        : Number(row.actual_monthly_revenue),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    answers: answers.get(String(row.id)) ?? {},
    documents: documents.get(String(row.id)) ?? [],
    activities: activities.get(String(row.id)) ?? [],
    handoffs: handoffs.get(String(row.id)) ?? [],
  }));
  const vendorApplications: VendorApplication[] = applicationRows.results.map(
    (row) => ({
      id: String(row.id),
      status: String(row.status) as VendorApplication['status'],
      companyName: String(row.company_name),
      contactName: String(row.contact_name),
      phone: String(row.phone),
      email: String(row.email),
      website: String(row.website ?? ''),
      primaryMarket: String(row.primary_market ?? ''),
      data: json(row.data_json, {}),
      requirements: json(row.requirements_json, []),
      source: String(row.source),
      submittedAt: String(row.submitted_at),
      reviewedAt: row.reviewed_at ? String(row.reviewed_at) : null,
      reviewedBy: row.reviewed_by ? String(row.reviewed_by) : null,
      createdVendorId: row.created_vendor_id
        ? String(row.created_vendor_id)
        : null,
    }),
  );
  return {
    vendors,
    leads,
    vendorApplications,
    settings: {
      capacityWeight: Number(settingRow?.capacity_weight ?? 30),
      priorityWeight: Number(settingRow?.priority_weight ?? 20),
      revenueWeight: Number(settingRow?.revenue_weight ?? 20),
      conversionWeight: Number(settingRow?.conversion_weight ?? 15),
      reliabilityWeight: Number(settingRow?.reliability_weight ?? 10),
      preferredWeight: Number(settingRow?.preferred_weight ?? 5),
    },
  };
}
