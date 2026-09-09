import assert from 'node:assert/strict';
import test from 'node:test';
import {
  approvalPlan,
  generateVendorHandoff,
  routeLead,
} from '../lib/routing.ts';
import {
  pendingVendorApplication,
  publicAttribution,
  recommendPublicLead,
  toPublicFormConfig,
  validatePublicLead,
  validateVendorApplication,
  vendorProfileFromApplication,
} from '../lib/public-intake.ts';
import type {
  Lead,
  Requirement,
  RoutingSettings,
  Vendor,
} from '../lib/types.ts';

const settings: RoutingSettings = {
  capacityWeight: 30,
  priorityWeight: 20,
  revenueWeight: 20,
  conversionWeight: 15,
  reliabilityWeight: 10,
  preferredWeight: 5,
};
const requirement = (vendorId: string, key = 'hookup'): Requirement => ({
  id: `${vendorId}-${key}`,
  vendorId,
  key,
  name: 'Dryer hookup',
  question: 'Is the hookup electric?',
  description: 'Customer-safe help',
  type: 'single_select',
  required: true,
  options: ['Electric', 'Gas'],
  qualifying: ['Electric'],
  disqualifying: ['Gas'],
  customerLabel: 'Dryer hookup',
  sortOrder: 1,
});
const vendor = (id: string, patch: Partial<Vendor> = {}): Vendor => ({
  id,
  name: `Vendor ${id}`,
  contactName: 'Private Contact',
  phone: '2145550000',
  email: 'private@example.com',
  website: 'https://vendor.test',
  publicSlug: id,
  publicFormEnabled: true,
  showVendorBranding: false,
  leadDeliveryMode: 'manual',
  active: true,
  preferred: false,
  cities: 'Dallas',
  maxLeadsDay: 2,
  maxLeadsWeek: 5,
  customerMonthlyPrice: 85,
  fulfillmentCost: 70,
  oneTimeRevenue: 25,
  recurringRevenue: 15,
  commissionPercent: 12,
  revenueModel: 'recurring',
  minimumTermMonths: 3,
  depositAmount: 50,
  deliveryFee: 20,
  installationFee: 0,
  supportsElectric: true,
  supportsGas: false,
  stackableAvailable: false,
  stairsAllowed: true,
  maxFlights: 1,
  signupUrl: 'https://vendor.test/signup',
  trackingUrl: 'secret',
  notes: 'internal note',
  priority: 60,
  reliability: 90,
  conversionRate: 55,
  partnershipStarted: '',
  zips: ['75060'],
  requirements: [requirement(id)],
  todayOverride: null,
  ...patch,
});
const lead = (patch: Partial<Lead> = {}): Lead => ({
  id: 'lead',
  displayId: 1042,
  source: 'Public website',
  campaign: '',
  marketplace: '',
  firstName: 'John',
  lastName: 'Smith',
  phone: '2145551234',
  email: 'john@example.com',
  zip: '75060',
  city: 'Irving',
  address: '',
  desiredTimeframe: 'Earliest available',
  availability: 'Weekdays',
  currentAppliance: '',
  notes: 'do not share this internal note',
  landingVendorId: null,
  landingVendorSlug: '',
  recommendedVendorId: null,
  publicSubmission: true,
  landingPage: '/rent',
  utmSource: 'facebook',
  utmMedium: 'paid_social',
  utmCampaign: 'fall',
  utmContent: 'creative-a',
  utmTerm: 'washer rental',
  fbclid: 'click-id',
  contactConsentAt: new Date().toISOString(),
  possibleDuplicateOf: null,
  assignedVendorId: null,
  recommendationScore: 0,
  sentAt: null,
  signupUrlSnapshot: null,
  paymentSetupStatus: 'not_started',
  status: 'pending_approval',
  lostReason: '',
  expectedMonthlyRevenue: 0,
  actualMonthlyRevenue: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  answers: { hookup: 'Electric' },
  documents: [],
  activities: [],
  handoffs: [],
  ...patch,
});

test('public vendor form returns the correct customer requirements', () => {
  const config = toPublicFormConfig(vendor('clark'));
  assert.equal(config.vendorSlug, 'clark');
  assert.deepEqual(
    config.requirements.map((item) => item.key),
    [
      'date_of_birth',
      'residence_type',
      'property_name',
      'unit_number',
      'rental_package',
      'delivery_date',
      'delivery_time_slot',
      'additional_notes',
      'hookup',
    ],
  );
});
test('public application requires the full reference intake', () => {
  const config = toPublicFormConfig(vendor('clark'));
  const result = validatePublicLead(
    {
      firstName: 'John',
      lastName: 'Smith',
      phone: '2145551234',
      email: 'john@example.com',
      zip: '75060',
      city: 'Irving',
      address: '100 Main St',
      consent: true,
      answers: {
        date_of_birth: '1990-01-01',
        residence_type: 'House',
        rental_package: 'Washer & Dryer Set',
        delivery_date: '2099-01-01',
        hookup: 'Electric',
      },
    },
    config.requirements,
  );
  assert.equal(result.ok, true);
});
test('apartment applications require property and unit details', () => {
  const config = toPublicFormConfig(vendor('clark'));
  const result = validatePublicLead(
    {
      firstName: 'John',
      lastName: 'Smith',
      phone: '2145551234',
      email: 'john@example.com',
      zip: '75060',
      city: 'Irving',
      address: '100 Main St',
      consent: true,
      answers: {
        date_of_birth: '1990-01-01',
        residence_type: 'Apartment / townhome / condo',
        rental_package: 'Washer & Dryer Set',
        delivery_date: '2099-01-01',
        hookup: 'Electric',
      },
    },
    config.requirements,
  );
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /Property name and unit number/);
});
test('public form config does not expose private vendor data', () => {
  const json = JSON.stringify(toPublicFormConfig(vendor('clark')));
  for (const secret of [
    'Private Contact',
    'private@example.com',
    'commissionPercent',
    'internal note',
    'recurringRevenue',
    'reliability',
    'trackingUrl',
  ])
    assert.equal(json.includes(secret), false);
});
test('customer submission attribution is preserved and bounded', () => {
  const target = vendor('clark');
  const attribution = publicAttribution(
    {
      utmSource: 'facebook',
      utmMedium: 'paid_social',
      utmCampaign: 'fall',
      utmContent: 'a',
      utmTerm: 'washer',
      fbclid: '123',
    },
    target,
    '/rent/clark',
  );
  assert.deepEqual(attribution, {
    landingVendorId: 'clark',
    landingVendorSlug: 'clark',
    publicSubmission: true,
    landingPage: '/rent/clark',
    utmSource: 'facebook',
    utmMedium: 'paid_social',
    utmCampaign: 'fall',
    utmContent: 'a',
    utmTerm: 'washer',
    fbclid: '123',
  });
});
test('intended vendor never forces assignment', () => {
  const target = vendor('clark');
  const intake = lead({ ...publicAttribution({}, target, '/rent/clark') });
  const decision = recommendPublicLead(intake, [target], [], settings);
  assert.equal(decision.assignedVendorId, null);
});
test('a full intended vendor lets another vendor win', () => {
  const intended = vendor('clark', { priority: 100 });
  const other = vendor('danny', { zips: ['75060'] });
  const existing = [
    lead({ id: 'one', assignedVendorId: 'clark' }),
    lead({ id: 'two', assignedVendorId: 'clark' }),
  ];
  assert.equal(
    routeLead(
      lead({ landingVendorId: 'clark' }),
      [intended, other],
      existing,
      settings,
    )[0].vendor.id,
    'danny',
  );
});
test('an intended vendor outside the ZIP lets another vendor win', () => {
  const intended = vendor('clark', { zips: ['99999'], priority: 100 });
  const other = vendor('danny');
  assert.equal(
    routeLead(
      lead({ landingVendorId: 'clark' }),
      [intended, other],
      [],
      settings,
    )[0].vendor.id,
    'danny',
  );
});
test('required disqualifying answer blocks a vendor', () => {
  assert.equal(
    routeLead(
      lead({ answers: { hookup: 'Gas' } }),
      [vendor('clark')],
      [],
      settings,
    )[0].eligible,
    false,
  );
});
test('missing requirement stays missing, not failed', () => {
  assert.equal(
    routeLead(lead({ answers: {} }), [vendor('clark')], [], settings)[0]
      .requirements[0].state,
    'missing',
  );
});
test('public lead receives recommendation without assignment', () => {
  const decision = recommendPublicLead(lead(), [vendor('clark')], [], settings);
  assert.equal(decision.recommendedVendorId, 'clark');
  assert.equal(decision.assignedVendorId, null);
  assert.equal(decision.status, 'pending_approval');
});
test('approval reruns routing and reports a changed recommendation', () => {
  const intended = vendor('clark', { priority: 100 });
  const other = vendor('danny');
  const existing = [
    lead({ id: 'one', assignedVendorId: 'clark' }),
    lead({ id: 'two', assignedVendorId: 'clark' }),
  ];
  const plan = approvalPlan(
    lead({ recommendedVendorId: 'clark' }),
    'clark',
    [intended, other],
    existing,
    settings,
  );
  assert.equal(plan.canApprove, false);
  assert.equal(plan.current?.vendor.id, 'danny');
});
test('approved assignments consume capacity while pending recommendations do not', () => {
  const v = vendor('clark');
  const pending = lead({
    id: 'pending',
    recommendedVendorId: 'clark',
    assignedVendorId: null,
  });
  assert.equal(routeLead(lead(), [v], [pending], settings)[0].usedToday, 0);
  const assigned = lead({
    id: 'assigned',
    recommendedVendorId: 'clark',
    assignedVendorId: 'clark',
  });
  assert.equal(routeLead(lead(), [v], [assigned], settings)[0].usedToday, 1);
});
test('public vendor application remains pending and creates no active vendor', () => {
  const validated = validateVendorApplication({
    companyName: 'Acme Rentals',
    contactName: 'Alex',
    phone: '2145551234',
    email: 'a@b.com',
    zips: '75060',
    requirements: [],
  });
  assert.equal(validated.ok, true);
  if (validated.ok) {
    const pending = pendingVendorApplication(validated.value);
    assert.equal(pending.status, 'pending');
    assert.equal(pending.createsActiveVendor, false);
  }
});
test('vendor approval mapping preserves ZIPs and requirements', () => {
  const validated = validateVendorApplication({
    companyName: 'Acme Rentals',
    contactName: 'Alex',
    phone: '2145551234',
    email: 'a@b.com',
    zips: '75060,75061',
    requirements: [
      {
        name: 'Hookup',
        question: 'Electric?',
        type: 'boolean',
        required: true,
        options: ['Yes', 'No'],
        qualifying: ['Yes'],
        disqualifying: ['No'],
      },
    ],
  });
  assert.equal(validated.ok, true);
  if (validated.ok) {
    const plan = vendorProfileFromApplication(validated.value);
    assert.deepEqual(plan.zips, ['75060', '75061']);
    assert.equal(plan.requirements[0].question, 'Electric?');
    assert.deepEqual(plan.requirements[0].qualifying, [true]);
    assert.equal(plan.vendor.publicFormEnabled, false);
  }
});
test('handoff message includes only customer-facing data', () => {
  const message = generateVendorHandoff(lead(), vendor('clark'));
  assert.match(message, /John Smith/);
  assert.match(message, /Dryer hookup: Electric/);
  for (const secret of [
    'internal note',
    'commission',
    'facebook',
    'fall',
    'reliability',
    'score',
    'Private Contact',
  ])
    assert.equal(message.toLowerCase().includes(secret.toLowerCase()), false);
});
