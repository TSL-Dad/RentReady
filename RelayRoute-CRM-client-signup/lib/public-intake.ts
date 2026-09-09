import { currentRecommendation } from './routing';
import {
  customerApplicationRequirements,
  type CustomerApplicationRequirement,
} from './customer-application';
import type {
  Lead,
  Requirement,
  RoutingSettings,
  Vendor,
  VendorApplicationRequirement,
} from './types';

const zipPattern = /^\d{5}(?:-\d{4})?$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const requirementTypes = new Set([
  'boolean',
  'text',
  'number',
  'single_select',
  'multi_select',
  'date',
]);

export const normalizePhone = (value: unknown) =>
  String(value ?? '')
    .replace(/\D/g, '')
    .slice(0, 15);
export const cleanText = (value: unknown, max = 200) =>
  String(value ?? '')
    .trim()
    .slice(0, max);
export const cleanSlug = (value: unknown) =>
  cleanText(value, 60)
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
export const cleanZip = (value: unknown) => cleanText(value, 10);

export type PublicRequirement = CustomerApplicationRequirement;
export type PublicFormConfig = {
  vendorSlug: string;
  heading: string;
  requirements: PublicRequirement[];
};

export function toPublicRequirement(
  requirement: Requirement,
): PublicRequirement {
  return {
    key: requirement.key,
    name: requirement.name,
    question: requirement.question,
    description: requirement.description,
    type: requirement.type,
    required: requirement.required,
    options: requirement.options,
    customerLabel: requirement.customerLabel,
    sortOrder: requirement.sortOrder,
  };
}

export function toPublicFormConfig(
  vendor: Vendor | null,
  genericRequirements: Requirement[] = [],
): PublicFormConfig {
  const seen = new Set<string>();
  const requirements = [
    ...customerApplicationRequirements,
    ...(vendor?.requirements ?? genericRequirements).map(toPublicRequirement),
  ].filter((requirement) => {
    if (seen.has(requirement.key)) return false;
    seen.add(requirement.key);
    return true;
  });
  return {
    vendorSlug: vendor?.publicSlug ?? '',
    heading: vendor?.showVendorBranding
      ? `Rent a washer & dryer with ${vendor.name}`
      : 'Washer & dryer rental request',
    requirements,
  };
}

export function publicAttribution(
  body: Record<string, unknown>,
  intended: Vendor | null,
  landingPage: string,
) {
  return {
    landingVendorId: intended?.id ?? null,
    landingVendorSlug: intended?.publicSlug ?? '',
    publicSubmission: true,
    landingPage: cleanText(landingPage, 300),
    utmSource: cleanText(body.utmSource, 100),
    utmMedium: cleanText(body.utmMedium, 100),
    utmCampaign: cleanText(body.utmCampaign, 160),
    utmContent: cleanText(body.utmContent, 160),
    utmTerm: cleanText(body.utmTerm, 160),
    fbclid: cleanText(body.fbclid, 300),
  };
}

export function recommendPublicLead(
  lead: Lead,
  vendors: Vendor[],
  existingLeads: Lead[],
  settings: RoutingSettings,
) {
  const recommendation = currentRecommendation(
    lead,
    vendors,
    existingLeads,
    settings,
  );
  return {
    recommendedVendorId: recommendation?.vendor.id ?? null,
    assignedVendorId: null,
    recommendationScore: recommendation?.score ?? 0,
    status: recommendation ? 'pending_approval' : 'no_vendor_available',
  };
}

export function pendingVendorApplication<T>(value: T) {
  return {
    status: 'pending' as const,
    data: value,
    createsActiveVendor: false,
  };
}

export function vendorProfileFromApplication(value: {
  zips: string[];
  requirements: VendorApplicationRequirement[];
  acceptingNewCustomers: boolean;
  [key: string]: unknown;
}) {
  return {
    vendor: {
      name: value.companyName,
      active: value.acceptingNewCustomers,
      publicFormEnabled: false,
      leadDeliveryMode: 'manual' as const,
    },
    zips: [...value.zips],
    requirements: value.requirements.map(normalizeApplicationRequirement),
  };
}

export function normalizeApplicationRequirement(
  requirement: VendorApplicationRequirement,
) {
  if (requirement.type !== 'boolean') return { ...requirement };
  const normalize = (value: string | boolean | number) =>
    typeof value === 'boolean'
      ? value
      : ['yes', 'true', '1'].includes(String(value).toLowerCase())
        ? true
        : ['no', 'false', '0'].includes(String(value).toLowerCase())
          ? false
          : value;
  return {
    ...requirement,
    qualifying: requirement.qualifying.map(normalize),
    disqualifying: requirement.disqualifying.map(normalize),
  };
}

export function validatePublicLead(
  body: Record<string, unknown>,
  requirements: PublicRequirement[],
) {
  const firstName = cleanText(body.firstName, 80),
    lastName = cleanText(body.lastName, 80),
    phone = normalizePhone(body.phone),
    email = cleanText(body.email, 160),
    zip = cleanZip(body.zip);
  if (cleanText(body.websiteField, 200))
    return { ok: false as const, error: 'Unable to submit this request' };
  if (!firstName || !lastName)
    return { ok: false as const, error: 'Full name is required' };
  if (phone.length < 10)
    return { ok: false as const, error: 'Enter a valid phone number' };
  if (!emailPattern.test(email))
    return { ok: false as const, error: 'Enter a valid email address' };
  if (!zipPattern.test(zip))
    return { ok: false as const, error: 'Enter a valid US ZIP code' };
  if (body.consent !== true)
    return { ok: false as const, error: 'Contact consent is required' };
  const rawAnswers =
    body.answers && typeof body.answers === 'object'
      ? (body.answers as Record<string, unknown>)
      : {};
  const answers: Record<string, unknown> = {};
  for (const requirement of requirements) {
    const value = rawAnswers[requirement.key];
    if (value === undefined || value === null || value === '') continue;
    if (requirement.type === 'boolean')
      answers[requirement.key] =
        value === true || value === 'true' || value === 'Yes';
    else if (requirement.type === 'multi_select') {
      const selected = Array.isArray(value)
        ? value
            .map((item) => cleanText(item, 100))
            .filter(Boolean)
            .slice(0, 20)
        : [];
      answers[requirement.key] = requirement.options.length
        ? selected.filter((item) => requirement.options.includes(item))
        : selected;
    } else if (requirement.type === 'single_select') {
      const selected = cleanText(value, 100);
      if (!requirement.options.length || requirement.options.includes(selected))
        answers[requirement.key] = selected;
    } else if (requirement.type === 'number') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) answers[requirement.key] = parsed;
    } else if (requirement.type === 'date') {
      const date = cleanText(value, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) answers[requirement.key] = date;
    } else answers[requirement.key] = cleanText(value, 500);
  }
  const missingRequired = requirements.find((requirement) => {
    if (!requirement.required) return false;
    const value = answers[requirement.key];
    return (
      value === undefined ||
      value === null ||
      value === '' ||
      (Array.isArray(value) && value.length === 0)
    );
  });
  if (missingRequired)
    return {
      ok: false as const,
      error: `${missingRequired.name} is required`,
    };
  if (!cleanText(body.address, 200) || !cleanText(body.city, 100))
    return {
      ok: false as const,
      error: 'Street address and city are required',
    };
  if (answers.residence_type !== 'House') {
    if (!answers.property_name || !answers.unit_number)
      return {
        ok: false as const,
        error: 'Property name and unit number are required for this address',
      };
  }
  const today = new Date().toISOString().slice(0, 10);
  if (String(answers.date_of_birth) >= today)
    return { ok: false as const, error: 'Enter a valid date of birth' };
  if (String(answers.delivery_date) < today)
    return {
      ok: false as const,
      error: 'Choose a delivery date that is today or later',
    };
  return {
    ok: true as const,
    value: {
      firstName,
      lastName,
      phone,
      email,
      zip,
      city: cleanText(body.city, 100),
      address: cleanText(body.address, 200),
      desiredTimeframe:
        cleanText(body.desiredTimeframe, 120) ||
        cleanText(answers.delivery_date, 10),
      availability:
        cleanText(body.availability, 200) ||
        cleanText(answers.delivery_time_slot, 100),
      answers,
    },
  };
}

export function validateVendorApplication(body: Record<string, unknown>) {
  const companyName = cleanText(body.companyName, 140),
    contactName = cleanText(body.contactName, 120),
    phone = normalizePhone(body.phone),
    email = cleanText(body.email, 160);
  if (cleanText(body.websiteField, 200))
    return { ok: false as const, error: 'Unable to submit this application' };
  if (!companyName || !contactName)
    return {
      ok: false as const,
      error: 'Company and contact names are required',
    };
  if (phone.length < 10)
    return { ok: false as const, error: 'Enter a valid phone number' };
  if (!emailPattern.test(email))
    return { ok: false as const, error: 'Enter a valid email address' };
  const zips = [
    ...new Set(
      cleanText(body.zips, 3000)
        .split(/[\s,]+/)
        .filter((zip) => /^\d{5}$/.test(zip)),
    ),
  ].slice(0, 300);
  if (!zips.length)
    return {
      ok: false as const,
      error: 'Add at least one 5-digit service ZIP code',
    };
  const requirements = (
    Array.isArray(body.requirements) ? body.requirements : []
  )
    .slice(0, 30)
    .flatMap((item) => {
      if (!item || typeof item !== 'object') return [];
      const input = item as Record<string, unknown>;
      const name = cleanText(input.name, 120),
        question = cleanText(input.question, 300),
        type = cleanText(input.type, 30);
      if (!name || !question || !requirementTypes.has(type)) return [];
      const list = (value: unknown) =>
        Array.isArray(value)
          ? value
              .map((v) => cleanText(v, 100))
              .filter(Boolean)
              .slice(0, 30)
          : cleanText(value, 1000)
              .split(',')
              .map((v) => v.trim())
              .filter(Boolean)
              .slice(0, 30);
      return [
        {
          name,
          question,
          type: type as Requirement['type'],
          required: input.required !== false,
          options: list(input.options),
          qualifying: list(input.qualifying),
          disqualifying: list(input.disqualifying),
          description: cleanText(input.description, 500),
        } satisfies VendorApplicationRequirement,
      ];
    });
  const value = {
    companyName,
    contactName,
    phone,
    email,
    website: cleanText(body.website, 200),
    primaryMarket: cleanText(body.primaryMarket, 140),
    zips,
    cities: cleanText(body.cities, 500),
    maxLeadsDay: Math.max(0, Math.min(100, Number(body.maxLeadsDay) || 0)),
    maxLeadsWeek: Math.max(0, Math.min(500, Number(body.maxLeadsWeek) || 0)),
    installsDay: Math.max(0, Math.min(100, Number(body.installsDay) || 0)),
    installsWeek: Math.max(0, Math.min(500, Number(body.installsWeek) || 0)),
    deliveryDays: cleanText(body.deliveryDays, 200),
    acceptingNewCustomers: body.acceptingNewCustomers !== false,
    customerMonthlyPrice: Math.max(0, Number(body.customerMonthlyPrice) || 0),
    deliveryFee: Math.max(0, Number(body.deliveryFee) || 0),
    installationFee: Math.max(0, Number(body.installationFee) || 0),
    depositAmount: Math.max(0, Number(body.depositAmount) || 0),
    minimumTermMonths: Math.max(0, Number(body.minimumTermMonths) || 0),
    supportsElectric: body.supportsElectric !== false,
    supportsGas: body.supportsGas === true,
    stackableAvailable: body.stackableAvailable === true,
    stairsAllowed: body.stairsAllowed !== false,
    maxFlights: Math.max(0, Math.min(20, Number(body.maxFlights) || 0)),
    recurringRevenue: Math.max(0, Number(body.recurringRevenue) || 0),
    oneTimeRevenue: Math.max(0, Number(body.oneTimeRevenue) || 0),
    revenueModel: ['recurring', 'one_time', 'percentage', 'other'].includes(
      cleanText(body.revenueModel, 30),
    )
      ? cleanText(body.revenueModel, 30)
      : 'recurring',
    paymentNotes: cleanText(body.paymentNotes, 1000),
    requirements,
  };
  return { ok: true as const, value };
}

export async function enforceRateLimit(
  db: D1Database,
  request: Request,
  scope: string,
  limit: number,
) {
  const address =
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    'unknown';
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`${scope}:${address.trim()}`),
  );
  const hash = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
  const hour = new Date();
  hour.setUTCMinutes(0, 0, 0);
  const key = `${scope}:${hour.toISOString()}:${hash}`;
  const expiresAt = new Date(hour.getTime() + 2 * 60 * 60 * 1000).toISOString();
  await db
    .prepare(
      'INSERT INTO public_rate_limits (key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1',
    )
    .bind(key, expiresAt)
    .run();
  const row = await db
    .prepare('SELECT count FROM public_rate_limits WHERE key=?')
    .bind(key)
    .first<{ count: number }>();
  return (row?.count ?? 1) <= limit;
}
