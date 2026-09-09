export type Requirement = {
  id: string;
  vendorId: string;
  key: string;
  name: string;
  question: string;
  description: string;
  type:
    | 'boolean'
    | 'text'
    | 'number'
    | 'single_select'
    | 'multi_select'
    | 'date';
  required: boolean;
  options: string[];
  qualifying: (string | boolean | number)[];
  disqualifying: (string | boolean | number)[];
  customerLabel: string;
  sortOrder: number;
};

export type Vendor = {
  id: string;
  name: string;
  contactName: string;
  phone: string;
  email: string;
  website: string;
  publicSlug: string;
  publicFormEnabled: boolean;
  showVendorBranding: boolean;
  leadDeliveryMode: 'manual' | 'sms' | 'email' | 'webhook';
  active: boolean;
  preferred: boolean;
  cities: string;
  maxLeadsDay: number;
  maxLeadsWeek: number | null;
  customerMonthlyPrice: number;
  fulfillmentCost: number;
  oneTimeRevenue: number;
  recurringRevenue: number;
  commissionPercent: number;
  revenueModel: string;
  minimumTermMonths: number | null;
  depositAmount: number;
  deliveryFee: number;
  installationFee: number;
  supportsElectric: boolean;
  supportsGas: boolean;
  stackableAvailable: boolean;
  stairsAllowed: boolean;
  maxFlights: number | null;
  signupUrl: string;
  trackingUrl: string;
  notes: string;
  priority: number;
  reliability: number;
  conversionRate: number;
  partnershipStarted: string;
  zips: string[];
  requirements: Requirement[];
  todayOverride?: number | null;
};

export type Lead = {
  id: string;
  displayId: number;
  source: string;
  campaign: string;
  marketplace: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  zip: string;
  city: string;
  address: string;
  desiredTimeframe: string;
  availability: string;
  currentAppliance: string;
  notes: string;
  landingVendorId: string | null;
  landingVendorSlug: string;
  recommendedVendorId: string | null;
  publicSubmission: boolean;
  landingPage: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string;
  utmTerm: string;
  fbclid: string;
  contactConsentAt: string | null;
  possibleDuplicateOf: string | null;
  assignedVendorId: string | null;
  recommendationScore: number;
  sentAt: string | null;
  signupUrlSnapshot: string | null;
  paymentSetupStatus: string;
  status: string;
  lostReason: string;
  expectedMonthlyRevenue: number;
  actualMonthlyRevenue: number | null;
  createdAt: string;
  updatedAt: string;
  answers: Record<string, unknown>;
  documents: LeadDocument[];
  activities: {
    id: string;
    type: string;
    description: string;
    createdAt: string;
  }[];
  handoffs: LeadHandoff[];
};

export type LeadDocument = {
  id: string;
  leadId: string;
  kind: 'paystub' | 'drivers_license';
  originalName: string;
  contentType: string;
  size: number;
  createdAt: string;
};

export type LeadHandoff = {
  id: string;
  leadId: string;
  vendorId: string;
  deliveryMethod: 'manual' | 'sms' | 'email' | 'webhook';
  status: 'drafted' | 'sent';
  messageSnapshot: string;
  approvedAt: string;
  sentAt: string | null;
  createdAt: string;
};

export type VendorApplicationRequirement = {
  name: string;
  question: string;
  type: Requirement['type'];
  required: boolean;
  options: string[];
  qualifying: (string | boolean | number)[];
  disqualifying: (string | boolean | number)[];
  description: string;
};

export type VendorApplication = {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  companyName: string;
  contactName: string;
  phone: string;
  email: string;
  website: string;
  primaryMarket: string;
  data: Record<string, unknown>;
  requirements: VendorApplicationRequirement[];
  source: string;
  submittedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  createdVendorId: string | null;
};

export type RoutingSettings = {
  capacityWeight: number;
  priorityWeight: number;
  revenueWeight: number;
  conversionWeight: number;
  reliabilityWeight: number;
  preferredWeight: number;
};

export type AppState = {
  vendors: Vendor[];
  leads: Lead[];
  settings: RoutingSettings;
  vendorApplications: VendorApplication[];
};

export type RequirementResult = {
  requirement: Requirement;
  state: 'satisfied' | 'missing' | 'failed' | 'not_applicable';
  answer?: unknown;
};

export type VendorMatch = {
  vendor: Vendor;
  eligible: boolean;
  score: number;
  usedToday: number;
  remainingToday: number;
  usedWeek: number;
  remainingWeek: number | null;
  reasons: string[];
  blockers: string[];
  requirements: RequirementResult[];
};
