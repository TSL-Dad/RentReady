import assert from 'node:assert/strict';
import test from 'node:test';
import { routeLead } from '../lib/routing.ts';
import type { Lead, RoutingSettings, Vendor } from '../lib/types.ts';

const settings: RoutingSettings = {
  capacityWeight: 30,
  priorityWeight: 20,
  revenueWeight: 20,
  conversionWeight: 15,
  reliabilityWeight: 10,
  preferredWeight: 5,
};
const requirement = (
  vendorId: string,
  key: string,
  qualifying: (string | boolean)[],
  disqualifying: (string | boolean)[],
) => ({
  id: vendorId + '_' + key,
  vendorId,
  key,
  name: key,
  question: key + '?',
  description: '',
  type: 'single_select' as const,
  required: true,
  options: ['Electric', 'Gas'],
  qualifying,
  disqualifying,
  customerLabel: key,
  sortOrder: 1,
});
const baseVendor = (id: string, name: string): Vendor => ({
  id,
  name,
  contactName: '',
  phone: '',
  email: '',
  website: '',
  publicSlug: id,
  publicFormEnabled: true,
  showVendorBranding: false,
  leadDeliveryMode: 'manual',
  active: true,
  preferred: false,
  cities: 'Dallas',
  maxLeadsDay: 5,
  maxLeadsWeek: 25,
  customerMonthlyPrice: 85,
  fulfillmentCost: 70,
  oneTimeRevenue: 0,
  recurringRevenue: 10,
  commissionPercent: 0,
  revenueModel: 'recurring',
  minimumTermMonths: null,
  depositAmount: 0,
  deliveryFee: 0,
  installationFee: 0,
  supportsElectric: true,
  supportsGas: false,
  stackableAvailable: false,
  stairsAllowed: true,
  maxFlights: null,
  signupUrl: 'https://example.com',
  trackingUrl: '',
  notes: '',
  priority: 60,
  reliability: 85,
  conversionRate: 50,
  partnershipStarted: '',
  zips: ['75212'],
  requirements: [],
  todayOverride: null,
});
const vendorA: Vendor = {
  ...baseVendor('a', 'Vendor A'),
  preferred: true,
  priority: 82,
  reliability: 94,
  conversionRate: 63,
  recurringRevenue: 15,
  requirements: [requirement('a', 'dryer_hookup', ['Electric'], ['Gas'])],
};
const vendorB: Vendor = {
  ...baseVendor('b', 'Vendor B'),
  maxLeadsDay: 3,
  priority: 68,
  reliability: 88,
  conversionRate: 54,
  supportsGas: true,
  requirements: [requirement('b', 'dryer_hookup', ['Electric', 'Gas'], [])],
};
const lead = (patch: Partial<Lead> = {}): Lead => ({
  id: 'lead',
  displayId: 1,
  source: 'Messenger',
  campaign: '',
  marketplace: '',
  firstName: 'Test',
  lastName: 'Lead',
  phone: '2145551234',
  email: '',
  zip: '75212',
  city: 'Dallas',
  address: '',
  desiredTimeframe: '',
  availability: '',
  currentAppliance: '',
  notes: '',
  landingVendorId: null,
  landingVendorSlug: '',
  recommendedVendorId: null,
  publicSubmission: false,
  landingPage: '',
  utmSource: '',
  utmMedium: '',
  utmCampaign: '',
  utmContent: '',
  utmTerm: '',
  fbclid: '',
  contactConsentAt: null,
  possibleDuplicateOf: null,
  assignedVendorId: null,
  recommendationScore: 0,
  sentAt: null,
  signupUrlSnapshot: null,
  paymentSetupStatus: 'not_started',
  status: 'new',
  lostReason: '',
  expectedMonthlyRevenue: 0,
  actualMonthlyRevenue: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  answers: {},
  documents: [],
  activities: [],
  handoffs: [],
  ...patch,
});

test('higher capacity and priority recommends Vendor A for ZIP 75212', () => {
  assert.equal(
    routeLead(lead(), [vendorA, vendorB], [], settings)[0].vendor.id,
    'a',
  );
});
test('gas hookup makes electric-only Vendor A ineligible and recommends Vendor B', () => {
  const results = routeLead(
    lead({ answers: { dryer_hookup: 'Gas' } }),
    [vendorA, vendorB],
    [],
    settings,
  );
  assert.equal(results[0].vendor.id, 'b');
  assert.equal(results.find((item) => item.vendor.id === 'a')?.eligible, false);
});
test('full daily capacity removes Vendor A from recommendation', () => {
  const assigned = Array.from({ length: 5 }, (_, index) =>
    lead({ id: 'assigned' + index, assignedVendorId: 'a' }),
  );
  assert.equal(
    routeLead(lead(), [vendorA, vendorB], assigned, settings)[0].vendor.id,
    'b',
  );
});
test('unserved ZIP has no eligible vendor', () => {
  assert.equal(
    routeLead(lead({ zip: '99999' }), [vendorA, vendorB], [], settings).some(
      (item) => item.eligible,
    ),
    false,
  );
});
test('requirements distinguish missing, satisfied, and failed', () => {
  assert.equal(
    routeLead(lead(), [vendorA], [], settings)[0].requirements[0].state,
    'missing',
  );
  assert.equal(
    routeLead(
      lead({ answers: { dryer_hookup: 'Electric' } }),
      [vendorA],
      [],
      settings,
    )[0].requirements[0].state,
    'satisfied',
  );
  assert.equal(
    routeLead(
      lead({ answers: { dryer_hookup: 'Gas' } }),
      [vendorA],
      [],
      settings,
    )[0].requirements[0].state,
    'failed',
  );
});
