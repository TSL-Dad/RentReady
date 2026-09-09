# RelayRoute CRM

RelayRoute is a washer/dryer rental intake and routing CRM. It combines public mobile-first customer and vendor forms with a private operations workspace, explainable vendor recommendations, human approval, and manual vendor handoffs.

## Complete workflow

Customer form:

1. A customer opens `/rent` or a vendor-targeted URL such as `/rent/abc`.
2. RelayRoute collects the applicant’s full contact and delivery address, date of birth, residence details, rental package, preferred delivery date/time, consent, vendor requirements, recent paystub, and driver’s-license front image.
3. The public API stores the application and document metadata in D1, the supporting-document bytes in private R2 storage, plus the landing vendor, UTM fields, and `fbclid`.
4. The existing routing engine evaluates every vendor. The landing vendor is context only and never bypasses ZIP, capacity, active-status, or requirement rules.
5. RelayRoute stores `recommendedVendorId`, leaves `assignedVendorId` empty, and places the lead in `pending_approval`.
6. An operator reviews Awaiting Approval. Approval reruns routing against current data; a changed winner must be reviewed again.
7. Approval sets `assignedVendorId`, stores a permanent manual handoff message snapshot, and changes the lead to `vendor_selected`.
8. The operator copies the message, sends it outside RelayRoute, and clicks Mark as Sent. RelayRoute records `sentAt`, the handoff status, and activity history.

Vendor application:

1. A prospective vendor submits `/vendor/apply`.
2. RelayRoute creates only a `pending` vendor application—not a routable vendor.
3. An operator reviews and can edit, reject, or choose Approve & Create Vendor.
4. Approval maps the profile, exact service ZIPs, and customer requirements into the vendor tables. The vendor form remains disabled until enabled in the vendor workspace.

## Intended, recommended, and assigned vendors

- `landingVendorId` is the intended/target vendor from the ad landing page.
- `recommendedVendorId` is the current best eligible result from `routeLead()`.
- `assignedVendorId` is the vendor a human approved.

Only assigned leads consume routing capacity. Pending recommendations do not count as sent or completed leads.

## Public form links

Open a vendor in the Vendors workspace, enter a unique public slug, and enable its public form. The workspace shows `/rent/[slug]` with a Copy Link button. `showVendorBranding` defaults to off, so the landing vendor can be recorded without revealing its company identity. `/rent` is the generic form.

Supported attribution query parameters are `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, and `fbclid`.

## Security boundary

Internal pages and APIs retain Sites/ChatGPT authentication:

- `/`, `/api/state`, `/api/leads`, `/api/vendors`, `/api/vendor-applications`, `/api/settings`, `/api/lead-documents/[documentId]`

Intentionally public routes are separate:

- `/rent`, `/rent/[vendorSlug]`, `/vendor/apply`
- `GET /api/public/form`
- `POST /api/public/leads`
- `POST /api/public/vendor-applications`

Public inputs are length-bounded, normalized, type-checked, honeypot-protected, and rate-limited in D1 using a one-way hash of the client address. Uploads are restricted to the listed file types and 5 MB per file. Supporting documents are stored in private R2 storage and can only be downloaded through an authenticated internal endpoint. Public form configuration contains only rendering fields and never vendor contacts, economics, notes, performance, routing settings, or unrelated vendor data. No banking or card details are collected.

Duplicate public phone submissions are preserved and linked to the most recent active/recent lead for internal review; they are never silently discarded and never auto-assigned.

## Local setup

Requirements: Node.js 22.13 or newer and npm.

For a fresh local D1 database:

```powershell
npm install
npx wrangler d1 execute site-creator-d1 --local --config wrangler.local.jsonc --file drizzle/0000_clammy_ultron.sql
npx wrangler d1 execute site-creator-d1 --local --config wrangler.local.jsonc --file drizzle/0001_flawless_lyja.sql
npx wrangler d1 execute site-creator-d1 --local --config wrangler.local.jsonc --file drizzle/0002_white_nextwave.sql
npm run dev
```

For an existing V2 local database, apply only `drizzle/0002_white_nextwave.sql`, then start the app. Open:

- Internal CRM: `http://localhost:3000`
- Generic customer form: `http://localhost:3000/rent`
- Demo targeted form after enabling a vendor slug: `http://localhost:3000/rent/abc`
- Vendor application: `http://localhost:3000/vendor/apply`

The first internal data request seeds demo data on a fresh database. Local development uses the Sites test identity printed by the development server.

## Verify

```powershell
npx tsc --noEmit
npm test
npm run build
```

The test suite covers the original routing behavior plus the full customer application requirements, conditional apartment validation, public form privacy, attribution, target-vendor fallback, missing/disqualifying requirements, recommendation versus assignment, approval-time rerouting, capacity accounting, application safety/mapping, and handoff redaction.

## Routing and capacity

The existing routing engine remains the source of truth. Vendors must be active, cover the exact five-digit ZIP, have daily and weekly capacity, and have no failed required answer. Missing answers remain missing and produce a focused follow-up message. Eligible vendors are ranked by configurable capacity, priority, recurring revenue, conversion, reliability, and preferred-vendor weights.

## Current external-service boundary

V1 does not send SMS, email, or webhooks. `lead_handoffs.delivery_method` is ready for those future methods, but the only implemented mode is `manual`: copy the generated snapshot, send it using the operator's chosen service, and mark it sent in RelayRoute.
