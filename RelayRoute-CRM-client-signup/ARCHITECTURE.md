# RelayRoute CRM architecture

## Stack and boundaries

RelayRoute keeps the existing Vinext, React 19, TypeScript, Cloudflare Worker, D1, R2, Drizzle, and Sites/ChatGPT authentication architecture. Public intake is additive: dedicated `/api/public/*` handlers perform strict validation and return deliberately restricted shapes. Existing internal handlers still require `apiUser()`.

## Data model

- `vendors`: existing profile, economics, capacity, and performance fields plus unique `public_slug`, `public_form_enabled`, `show_vendor_branding`, and future-ready `lead_delivery_mode`.
- `vendor_service_zips`: exact service coverage.
- `vendor_requirements`: the single shared typed requirement model used by public forms and internal qualification.
- `leads`: contact and workflow state plus landing vendor, recommendation, public-submission flag, landing page, UTM/fbclid attribution, contact-consent timestamp, availability, and possible-duplicate link.
- `lead_requirement_answers`: reusable answers keyed by stable requirement key.
- `lead_documents`: private R2 object metadata for required paystub and driver’s-license uploads.
- `lead_activities`: append-only operational audit timeline.
- `lead_handoffs`: approved vendor, delivery method, drafted/sent state, immutable message snapshot, approval time, and sent time.
- `vendor_applications`: pending/approved/rejected application record, original normalized application JSON, requirement JSON, reviewer metadata, and created-vendor link.
- `public_rate_limits`: hourly hashed-client counters for public submission endpoints.
- `capacity_overrides`, `routing_settings`, and `conversion_events`: existing capacity, scoring, and conversion models.

Migration `0001_flawless_lyja.sql` adds the original public-intake workflow. Append-only migration `0002_white_nextwave.sql` adds document metadata without changing either earlier migration.

## Route map

Public pages:

- `/rent`: generic mobile customer intake.
- `/rent/[vendorSlug]`: vendor-targeted intake; the target is recorded but does not force routing.
- `/vendor/apply`: public partner application.

Public APIs:

- `GET /api/public/form?slug=...`: returns only public heading and safe requirement-rendering fields.
- `POST /api/public/leads`: validates and rate-limits a multipart application, stores supporting documents in R2, stores the record/metadata/answers in D1, routes all vendors, and saves an unassigned recommendation.
- `POST /api/public/vendor-applications`: validates, rate-limits, and stores a pending application only.

Authenticated APIs:

- `/api/state`: complete internal workspace state.
- `/api/leads`: internal capture, answers, recommendations, approval-time rerouting, manual assignment compatibility, handoff sent state, notes, and conversion statuses.
- `/api/vendors`: vendor profiles, public-form settings, ZIPs, requirements, and capacity overrides.
- `/api/vendor-applications`: edit, reject, or approve/create a vendor and its ZIP/requirement records.
- `/api/settings`: routing weights.
- `GET /api/lead-documents/[documentId]`: authenticated, no-store download from private R2 storage.

## Routing and approval invariants

`routeLead()` is unchanged as the routing source of truth and extended only with weekly capacity display and clearer requirement reasons. Eligibility remains active vendor + exact ZIP + remaining daily/weekly capacity + no failed required requirement. Missing required answers are visible but do not become failed.

Public submission calls the same engine and writes only `recommendedVendorId`; `assignedVendorId` stays null. Approval calls `approvalPlan()`, which reruns the full engine against current D1 state. If the requested recommendation is no longer the top eligible vendor, the API saves and returns the new recommendation without assigning. A successful approval creates both the assignment and a manual handoff snapshot in one D1 batch.

Capacity counts only `assignedVendorId`. A pending recommendation is informational and cannot consume a slot or imply delivery.

## Privacy and future delivery

`toPublicFormConfig()` is an allowlist rather than a redacted internal vendor object. The common application questions are merged with vendor-specific requirements by stable key. Supporting document bytes never enter D1 or the vendor handoff; they live in private R2 storage and require an authenticated internal download request. `generateVendorHandoff()` builds from customer contact, timing, address, and answers for the approved vendor's customer-facing requirements. It excludes scores, comparisons, attribution, economics, commission, reliability, vendor contacts, internal notes, and uploaded document contents.

Handoffs model `manual`, `sms`, `email`, and `webhook` delivery methods, but only manual copy/mark-sent is implemented. Adding an external sender later should create an immutable handoff first, perform delivery through a secret-bearing server integration, then record provider status without exposing credentials to the client.
