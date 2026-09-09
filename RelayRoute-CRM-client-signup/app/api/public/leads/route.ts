import { getDb, getUploads } from '@/db';
import {
  cleanSlug,
  cleanText,
  enforceRateLimit,
  publicAttribution,
  recommendPublicLead,
  toPublicFormConfig,
  validatePublicLead,
} from '@/lib/public-intake';
import { loadState } from '@/lib/server-data';
import type { Lead } from '@/lib/types';

const activeStatuses = [
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
];

const maxFileBytes = 5 * 1024 * 1024;
const uploadRules = {
  paystub: {
    kind: 'paystub',
    label: 'Recent paystub',
    types: new Set(['application/pdf', 'image/jpeg', 'image/png']),
  },
  driversLicense: {
    kind: 'drivers_license',
    label: "Driver's license",
    types: new Set(['image/jpeg', 'image/png']),
  },
} as const;

type SubmittedDocument = {
  kind: 'paystub' | 'drivers_license';
  originalName: string;
  contentType: string;
  size: number;
  bytes: ArrayBuffer;
};

function fileSignatureMatches(contentType: string, buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  if (contentType === 'image/png')
    return [137, 80, 78, 71, 13, 10, 26, 10].every(
      (byte, index) => bytes[index] === byte,
    );
  if (contentType === 'image/jpeg')
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (contentType === 'application/pdf')
    return new TextDecoder()
      .decode(bytes.slice(0, 1024))
      .includes('%PDF-');
  return false;
}

async function submission(request: Request) {
  if (!request.headers.get('content-type')?.includes('multipart/form-data'))
    return {
      error: 'A recent paystub and driver’s license image are required',
    } as const;
  let data: FormData;
  try {
    data = await request.formData();
  } catch {
    return { error: 'Invalid application upload' } as const;
  }
  const payload = data.get('payload');
  if (typeof payload !== 'string')
    return { error: 'Application details are required' } as const;
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(payload) as Record<string, unknown>;
  } catch {
    return { error: 'Invalid application details' } as const;
  }
  const documents: SubmittedDocument[] = [];
  for (const [field, rule] of Object.entries(uploadRules) as [
    keyof typeof uploadRules,
    (typeof uploadRules)[keyof typeof uploadRules],
  ][]) {
    const value = data.get(field);
    if (!(value instanceof File) || value.size === 0)
      return { error: `${rule.label} is required` } as const;
    if (value.size > maxFileBytes)
      return { error: `${rule.label} must be 5 MB or smaller` } as const;
    if (!rule.types.has(value.type))
      return { error: `${rule.label} has an unsupported file type` } as const;
    const bytes = await value.arrayBuffer();
    if (!fileSignatureMatches(value.type, bytes))
      return {
        error: `${rule.label} does not match the selected file type`,
      } as const;
    documents.push({
      kind: rule.kind,
      originalName: cleanText(value.name, 180) || `${rule.kind}.upload`,
      contentType: value.type,
      size: value.size,
      bytes,
    });
  }
  return { body, documents } as const;
}

export async function POST(request: Request) {
  const db = getDb();
  if (!(await enforceRateLimit(db, request, 'customer-lead', 12)))
    return Response.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 },
    );
  const submitted = await submission(request);
  if ('error' in submitted)
    return Response.json({ error: submitted.error }, { status: 400 });
  const { body, documents } = submitted;
  const slug = cleanSlug(body.vendorSlug);
  const state = await loadState('public-intake');
  const intended = slug
    ? state.vendors.find(
        (vendor) => vendor.publicSlug === slug && vendor.publicFormEnabled,
      )
    : null;
  if (slug && !intended)
    return Response.json(
      { error: 'This rental form is unavailable.' },
      { status: 404 },
    );
  const seen = new Set<string>();
  const generic = state.vendors
    .filter((vendor) => vendor.active && vendor.publicFormEnabled)
    .flatMap((vendor) => vendor.requirements)
    .filter(
      (requirement) => !seen.has(requirement.key) && seen.add(requirement.key),
    );
  const requirements = toPublicFormConfig(
    intended ?? null,
    generic,
  ).requirements;
  const validated = validatePublicLead(body, requirements);
  if (!validated.ok)
    return Response.json({ error: validated.error }, { status: 400 });
  const value = validated.value;
  const now = new Date().toISOString();
  const max = await db
    .prepare('SELECT COALESCE(MAX(display_id),1041) AS max_id FROM leads')
    .first<{ max_id: number }>();
  const duplicate = await db
    .prepare(
      `SELECT id FROM leads WHERE phone=? AND status IN (${activeStatuses.map(() => '?').join(',')}) AND created_at>=? ORDER BY created_at DESC LIMIT 1`,
    )
    .bind(
      value.phone,
      ...activeStatuses,
      new Date(Date.now() - 90 * 86400000).toISOString(),
    )
    .first<{ id: string }>();
  const id = crypto.randomUUID();
  const attribution = publicAttribution(
    body,
    intended ?? null,
    cleanText(body.landingPage, 300) || `/rent${slug ? `/${slug}` : ''}`,
  );
  const lead: Lead = {
    id,
    displayId: (max?.max_id ?? 1041) + 1,
    source: cleanText(body.utmSource, 100) || 'Public website',
    campaign: cleanText(body.utmCampaign, 160),
    marketplace: cleanText(body.marketplace, 100),
    firstName: value.firstName,
    lastName: value.lastName,
    phone: value.phone,
    email: value.email,
    zip: value.zip,
    city: value.city,
    address: value.address,
    desiredTimeframe: value.desiredTimeframe,
    availability: value.availability,
    currentAppliance: '',
    notes: '',
    ...attribution,
    recommendedVendorId: null,
    contactConsentAt: now,
    possibleDuplicateOf: duplicate?.id ?? null,
    assignedVendorId: null,
    recommendationScore: 0,
    sentAt: null,
    signupUrlSnapshot: null,
    paymentSetupStatus: 'not_started',
    status: 'pending_approval',
    lostReason: '',
    expectedMonthlyRevenue: 0,
    actualMonthlyRevenue: null,
    createdAt: now,
    updatedAt: now,
    answers: value.answers,
    documents: [],
    activities: [],
    handoffs: [],
  };
  const decision = recommendPublicLead(
    lead,
    state.vendors,
    state.leads,
    state.settings,
  );
  Object.assign(lead, decision);
  const recommendation = state.vendors.find(
    (vendor) => vendor.id === lead.recommendedVendorId,
  );
  const uploadRows = documents.map((document) => {
    const documentId = crypto.randomUUID();
    return {
      id: documentId,
      leadId: id,
      kind: document.kind,
      originalName: document.originalName,
      objectKey: `lead-documents/${id}/${documentId}`,
      contentType: document.contentType,
      size: document.size,
      createdAt: now,
      bytes: document.bytes,
    };
  });
  let uploads: R2Bucket | null = null;
  const storedObjectKeys: string[] = [];
  try {
    uploads = getUploads();
    for (const document of uploadRows) {
      await uploads.put(document.objectKey, document.bytes, {
        httpMetadata: { contentType: document.contentType },
        customMetadata: { leadId: id, kind: document.kind },
      });
      storedObjectKeys.push(document.objectKey);
    }
  } catch {
    if (uploads) {
      const uploadBucket = uploads;
      await Promise.allSettled(
        storedObjectKeys.map((objectKey) => uploadBucket.delete(objectKey)),
      );
    }
    return Response.json(
      { error: 'Supporting documents could not be stored. Please try again.' },
      { status: 503 },
    );
  }
  if (!uploads)
    return Response.json(
      { error: 'Supporting document storage is unavailable.' },
      { status: 503 },
    );
  const statements = [
    db
      .prepare(
        `INSERT INTO leads (id,display_id,owner_user_id,source,campaign,marketplace,first_name,last_name,phone,email,zip,city,address,desired_timeframe,availability,current_appliance,notes,landing_vendor_id,landing_vendor_slug,recommended_vendor_id,public_submission,landing_page,utm_source,utm_medium,utm_campaign,utm_content,utm_term,fbclid,contact_consent_at,possible_duplicate_of,assigned_vendor_id,recommendation_score,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      )
      .bind(
        id,
        lead.displayId,
        'public-intake',
        lead.source,
        lead.campaign,
        lead.marketplace,
        lead.firstName,
        lead.lastName,
        lead.phone,
        lead.email,
        lead.zip,
        lead.city,
        lead.address,
        lead.desiredTimeframe,
        lead.availability,
        '',
        '',
        lead.landingVendorId,
        lead.landingVendorSlug,
        lead.recommendedVendorId,
        1,
        lead.landingPage,
        lead.utmSource,
        lead.utmMedium,
        lead.utmCampaign,
        lead.utmContent,
        lead.utmTerm,
        lead.fbclid,
        now,
        lead.possibleDuplicateOf,
        null,
        lead.recommendationScore,
        lead.status,
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
        'public',
        'public_submission',
        'Public rental request submitted',
        JSON.stringify({ landingVendorSlug: lead.landingVendorSlug }),
        now,
      ),
    db
      .prepare(
        'INSERT INTO lead_activities (id,lead_id,actor_user_id,type,description,metadata_json,created_at) VALUES (?,?,?,?,?,?,?)',
      )
      .bind(
        crypto.randomUUID(),
        id,
        'system',
        'routing',
        recommendation
          ? `${recommendation.name} recommended at score ${lead.recommendationScore}`
          : `No eligible vendor available for ZIP ${lead.zip.slice(0, 5)}`,
        JSON.stringify({
          recommendedVendorId: lead.recommendedVendorId,
          score: lead.recommendationScore,
        }),
        now,
      ),
    ...Object.entries(lead.answers).map(([key, answer]) =>
      db
        .prepare(
          'INSERT INTO lead_requirement_answers (id,lead_id,requirement_key,value_json,updated_at) VALUES (?,?,?,?,?)',
        )
        .bind(crypto.randomUUID(), id, key, JSON.stringify(answer), now),
    ),
    ...uploadRows.map((document) =>
      db
        .prepare(
          'INSERT INTO lead_documents (id,lead_id,kind,original_name,object_key,content_type,size,created_at) VALUES (?,?,?,?,?,?,?,?)',
        )
        .bind(
          document.id,
          document.leadId,
          document.kind,
          document.originalName,
          document.objectKey,
          document.contentType,
          document.size,
          document.createdAt,
        ),
    ),
  ];
  if (intended)
    statements.splice(
      2,
      0,
      db
        .prepare(
          'INSERT INTO lead_activities (id,lead_id,actor_user_id,type,description,metadata_json,created_at) VALUES (?,?,?,?,?,?,?)',
        )
        .bind(
          crypto.randomUUID(),
          id,
          'system',
          'intended_vendor',
          `${intended.name} recorded as intended vendor`,
          '{}',
          now,
        ),
    );
  if (duplicate)
    statements.push(
      db
        .prepare(
          'INSERT INTO lead_activities (id,lead_id,actor_user_id,type,description,metadata_json,created_at) VALUES (?,?,?,?,?,?,?)',
        )
        .bind(
          crypto.randomUUID(),
          id,
          'system',
          'possible_duplicate',
          'Possible duplicate phone number found',
          JSON.stringify({ possibleDuplicateOf: duplicate.id }),
          now,
        ),
    );
  try {
    await db.batch(statements);
  } catch {
    await Promise.allSettled(
      uploadRows.map((document) => uploads.delete(document.objectKey)),
    );
    return Response.json(
      { error: 'Application could not be saved. Please try again.' },
      { status: 500 },
    );
  }
  return Response.json(
    { ok: true, reference: lead.displayId },
    { status: 201 },
  );
}
