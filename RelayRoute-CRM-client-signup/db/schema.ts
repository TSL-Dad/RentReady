import {
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
  index,
} from 'drizzle-orm/sqlite-core';

export const vendors = sqliteTable(
  'vendors',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    contactName: text('contact_name'),
    phone: text('phone'),
    email: text('email'),
    website: text('website'),
    publicSlug: text('public_slug'),
    publicFormEnabled: integer('public_form_enabled', { mode: 'boolean' })
      .notNull()
      .default(false),
    showVendorBranding: integer('show_vendor_branding', { mode: 'boolean' })
      .notNull()
      .default(false),
    leadDeliveryMode: text('lead_delivery_mode').notNull().default('manual'),
    active: integer('active', { mode: 'boolean' }).notNull().default(true),
    preferred: integer('preferred', { mode: 'boolean' })
      .notNull()
      .default(false),
    cities: text('cities').notNull().default(''),
    maxLeadsDay: integer('max_leads_day').notNull().default(5),
    maxLeadsWeek: integer('max_leads_week'),
    customerMonthlyPrice: real('customer_monthly_price').notNull().default(0),
    fulfillmentCost: real('fulfillment_cost').notNull().default(0),
    oneTimeRevenue: real('one_time_revenue').notNull().default(0),
    recurringRevenue: real('recurring_revenue').notNull().default(0),
    commissionPercent: real('commission_percent').notNull().default(0),
    revenueModel: text('revenue_model').notNull().default('recurring'),
    minimumTermMonths: integer('minimum_term_months'),
    depositAmount: real('deposit_amount').notNull().default(0),
    deliveryFee: real('delivery_fee').notNull().default(0),
    installationFee: real('installation_fee').notNull().default(0),
    supportsElectric: integer('supports_electric', { mode: 'boolean' })
      .notNull()
      .default(true),
    supportsGas: integer('supports_gas', { mode: 'boolean' })
      .notNull()
      .default(false),
    stackableAvailable: integer('stackable_available', { mode: 'boolean' })
      .notNull()
      .default(false),
    stairsAllowed: integer('stairs_allowed', { mode: 'boolean' })
      .notNull()
      .default(true),
    maxFlights: integer('max_flights'),
    signupUrl: text('signup_url'),
    trackingUrl: text('tracking_url'),
    notes: text('notes').notNull().default(''),
    priority: integer('priority').notNull().default(50),
    reliability: integer('reliability').notNull().default(80),
    conversionRate: real('conversion_rate').notNull().default(0),
    partnershipStarted: text('partnership_started'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [uniqueIndex('idx_vendors_public_slug').on(table.publicSlug)],
);

export const vendorServiceZips = sqliteTable(
  'vendor_service_zips',
  {
    id: text('id').primaryKey(),
    vendorId: text('vendor_id')
      .notNull()
      .references(() => vendors.id, { onDelete: 'cascade' }),
    zip: text('zip').notNull(),
  },
  (table) => [
    uniqueIndex('idx_vendor_service_zip_unique').on(table.vendorId, table.zip),
    index('idx_vendor_service_zip_zip').on(table.zip),
  ],
);

export const vendorRequirements = sqliteTable(
  'vendor_requirements',
  {
    id: text('id').primaryKey(),
    vendorId: text('vendor_id')
      .notNull()
      .references(() => vendors.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    name: text('name').notNull(),
    question: text('question').notNull(),
    description: text('description').notNull().default(''),
    type: text('type').notNull().default('boolean'),
    required: integer('required', { mode: 'boolean' }).notNull().default(true),
    optionsJson: text('options_json').notNull().default('[]'),
    qualifyingJson: text('qualifying_json').notNull().default('[]'),
    disqualifyingJson: text('disqualifying_json').notNull().default('[]'),
    customerLabel: text('customer_label').notNull().default(''),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (table) => [
    uniqueIndex('idx_vendor_requirement_key').on(table.vendorId, table.key),
  ],
);

export const leads = sqliteTable(
  'leads',
  {
    id: text('id').primaryKey(),
    displayId: integer('display_id').notNull(),
    ownerUserId: text('owner_user_id').notNull(),
    source: text('source').notNull().default('Facebook Messenger'),
    campaign: text('campaign').notNull().default(''),
    marketplace: text('marketplace').notNull().default(''),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull().default(''),
    phone: text('phone').notNull(),
    email: text('email').notNull().default(''),
    zip: text('zip').notNull(),
    city: text('city').notNull().default(''),
    address: text('address').notNull().default(''),
    desiredTimeframe: text('desired_timeframe').notNull().default(''),
    availability: text('availability').notNull().default(''),
    currentAppliance: text('current_appliance').notNull().default(''),
    notes: text('notes').notNull().default(''),
    landingVendorId: text('landing_vendor_id').references(() => vendors.id),
    landingVendorSlug: text('landing_vendor_slug').notNull().default(''),
    recommendedVendorId: text('recommended_vendor_id').references(
      () => vendors.id,
    ),
    publicSubmission: integer('public_submission', { mode: 'boolean' })
      .notNull()
      .default(false),
    landingPage: text('landing_page').notNull().default(''),
    utmSource: text('utm_source').notNull().default(''),
    utmMedium: text('utm_medium').notNull().default(''),
    utmCampaign: text('utm_campaign').notNull().default(''),
    utmContent: text('utm_content').notNull().default(''),
    utmTerm: text('utm_term').notNull().default(''),
    fbclid: text('fbclid').notNull().default(''),
    contactConsentAt: text('contact_consent_at'),
    possibleDuplicateOf: text('possible_duplicate_of'),
    assignedVendorId: text('assigned_vendor_id').references(() => vendors.id),
    recommendationScore: real('recommendation_score').notNull().default(0),
    sentAt: text('sent_at'),
    signupUrlSnapshot: text('signup_url_snapshot'),
    paymentSetupStatus: text('payment_setup_status')
      .notNull()
      .default('not_started'),
    status: text('status').notNull().default('new'),
    lostReason: text('lost_reason').notNull().default(''),
    expectedMonthlyRevenue: real('expected_monthly_revenue')
      .notNull()
      .default(0),
    actualMonthlyRevenue: real('actual_monthly_revenue'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    uniqueIndex('idx_leads_display_id').on(table.displayId),
    index('idx_leads_phone').on(table.phone),
    index('idx_leads_zip').on(table.zip),
    index('idx_leads_status').on(table.status),
    index('idx_leads_vendor').on(table.assignedVendorId),
    index('idx_leads_recommended_vendor').on(table.recommendedVendorId),
    index('idx_leads_landing_vendor').on(table.landingVendorId),
  ],
);

export const leadRequirementAnswers = sqliteTable(
  'lead_requirement_answers',
  {
    id: text('id').primaryKey(),
    leadId: text('lead_id')
      .notNull()
      .references(() => leads.id, { onDelete: 'cascade' }),
    requirementKey: text('requirement_key').notNull(),
    valueJson: text('value_json').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    uniqueIndex('idx_lead_answer_key').on(table.leadId, table.requirementKey),
  ],
);

export const leadDocuments = sqliteTable(
  'lead_documents',
  {
    id: text('id').primaryKey(),
    leadId: text('lead_id')
      .notNull()
      .references(() => leads.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),
    originalName: text('original_name').notNull(),
    objectKey: text('object_key').notNull(),
    contentType: text('content_type').notNull(),
    size: integer('size').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    index('idx_lead_documents_lead').on(table.leadId, table.createdAt),
  ],
);

export const leadActivities = sqliteTable(
  'lead_activities',
  {
    id: text('id').primaryKey(),
    leadId: text('lead_id')
      .notNull()
      .references(() => leads.id, { onDelete: 'cascade' }),
    actorUserId: text('actor_user_id').notNull(),
    type: text('type').notNull(),
    description: text('description').notNull(),
    metadataJson: text('metadata_json').notNull().default('{}'),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    index('idx_lead_activities_lead').on(table.leadId, table.createdAt),
  ],
);

export const capacityOverrides = sqliteTable(
  'capacity_overrides',
  {
    id: text('id').primaryKey(),
    vendorId: text('vendor_id')
      .notNull()
      .references(() => vendors.id, { onDelete: 'cascade' }),
    date: text('date').notNull(),
    maxLeads: integer('max_leads').notNull(),
    note: text('note').notNull().default(''),
  },
  (table) => [
    uniqueIndex('idx_capacity_override_vendor_date').on(
      table.vendorId,
      table.date,
    ),
  ],
);

export const routingSettings = sqliteTable('routing_settings', {
  id: text('id').primaryKey(),
  capacityWeight: real('capacity_weight').notNull().default(30),
  priorityWeight: real('priority_weight').notNull().default(20),
  revenueWeight: real('revenue_weight').notNull().default(20),
  conversionWeight: real('conversion_weight').notNull().default(15),
  reliabilityWeight: real('reliability_weight').notNull().default(10),
  preferredWeight: real('preferred_weight').notNull().default(5),
  updatedAt: text('updated_at').notNull(),
});

export const conversionEvents = sqliteTable(
  'conversion_events',
  {
    id: text('id').primaryKey(),
    leadId: text('lead_id')
      .notNull()
      .references(() => leads.id, { onDelete: 'cascade' }),
    vendorId: text('vendor_id').references(() => vendors.id),
    eventType: text('event_type').notNull(),
    source: text('source').notNull().default('manual'),
    externalEventId: text('external_event_id'),
    occurredAt: text('occurred_at').notNull(),
    payloadJson: text('payload_json').notNull().default('{}'),
  },
  (table) => [
    index('idx_conversion_events_lead').on(table.leadId, table.occurredAt),
  ],
);

export const leadHandoffs = sqliteTable(
  'lead_handoffs',
  {
    id: text('id').primaryKey(),
    leadId: text('lead_id')
      .notNull()
      .references(() => leads.id, { onDelete: 'cascade' }),
    vendorId: text('vendor_id')
      .notNull()
      .references(() => vendors.id),
    deliveryMethod: text('delivery_method').notNull().default('manual'),
    status: text('status').notNull().default('drafted'),
    messageSnapshot: text('message_snapshot').notNull(),
    approvedAt: text('approved_at').notNull(),
    sentAt: text('sent_at'),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    index('idx_lead_handoffs_lead').on(table.leadId, table.createdAt),
  ],
);

export const vendorApplications = sqliteTable(
  'vendor_applications',
  {
    id: text('id').primaryKey(),
    status: text('status').notNull().default('pending'),
    companyName: text('company_name').notNull(),
    contactName: text('contact_name').notNull(),
    phone: text('phone').notNull(),
    email: text('email').notNull(),
    website: text('website').notNull().default(''),
    primaryMarket: text('primary_market').notNull().default(''),
    dataJson: text('data_json').notNull(),
    requirementsJson: text('requirements_json').notNull().default('[]'),
    source: text('source').notNull().default('public_vendor_application'),
    submittedAt: text('submitted_at').notNull(),
    reviewedAt: text('reviewed_at'),
    reviewedBy: text('reviewed_by'),
    createdVendorId: text('created_vendor_id').references(() => vendors.id),
  },
  (table) => [
    index('idx_vendor_applications_status').on(table.status, table.submittedAt),
  ],
);

export const publicRateLimits = sqliteTable('public_rate_limits', {
  key: text('key').primaryKey(),
  count: integer('count').notNull().default(0),
  expiresAt: text('expires_at').notNull(),
});
