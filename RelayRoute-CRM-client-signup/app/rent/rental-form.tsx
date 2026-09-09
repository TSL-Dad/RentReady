'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileCheck2,
  FileUp,
  LoaderCircle,
  LockKeyhole,
  WashingMachine,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { customerApplicationKeys } from '@/lib/customer-application';
import type { PublicFormConfig, PublicRequirement } from '@/lib/public-intake';

type FormState = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  zip: string;
  city: string;
  address: string;
  consent: boolean;
  websiteField: string;
  answers: Record<string, unknown>;
};

const initial: FormState = {
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  zip: '',
  city: '',
  address: '',
  consent: false,
  websiteField: '',
  answers: { rental_package: 'Washer & Dryer Set' },
};

const maxFileBytes = 5 * 1024 * 1024;
const paystubTypes = new Set(['application/pdf', 'image/jpeg', 'image/png']);
const licenseTypes = new Set(['image/jpeg', 'image/png']);

async function jsonRequest(url: string, init?: RequestInit) {
  const isFormData = init?.body instanceof FormData;
  const response = await fetch(url, {
    ...init,
    headers: isFormData
      ? init?.headers
      : { 'Content-Type': 'application/json', ...init?.headers },
  });
  const data = (await response.json()) as Record<string, unknown>;
  if (!response.ok)
    throw new Error(
      typeof data.error === 'string'
        ? data.error
        : 'Something went wrong. Please try again.',
    );
  return data;
}

const Field = ({
  label,
  children,
  optional,
}: {
  label: string;
  children: React.ReactNode;
  optional?: boolean;
}) => (
  <label className="grid gap-2 text-sm font-semibold text-slate-800">
    <span>
      {label}
      {optional && (
        <span className="ml-1 font-normal text-slate-500">(optional)</span>
      )}
    </span>
    {children}
  </label>
);

function RequirementControl({
  requirement,
  value,
  onChange,
}: {
  requirement: PublicRequirement;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  if (requirement.type === 'boolean')
    return (
      <div className="grid grid-cols-2 gap-3">
        {[
          ['Yes', true],
          ['No', false],
        ].map(([label, answer]) => (
          <button
            type="button"
            key={label as string}
            onClick={() => onChange(answer)}
            className={`min-h-13 rounded-xl border px-4 text-base font-semibold ${value === answer ? 'border-blue-600 bg-blue-50 text-blue-800' : 'bg-white text-slate-700'}`}
          >
            {label as string}
          </button>
        ))}
      </div>
    );
  if (requirement.type === 'single_select')
    return (
      <div className="grid gap-2">
        {requirement.options.map((option) => (
          <label
            key={option}
            className={`flex min-h-12 items-center gap-3 rounded-xl border px-4 ${value === option ? 'border-blue-600 bg-blue-50' : 'bg-white'}`}
          >
            <input
              type="radio"
              name={requirement.key}
              checked={value === option}
              onChange={() => onChange(option)}
              className="size-4"
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    );
  if (requirement.type === 'multi_select')
    return (
      <div className="grid gap-2">
        {requirement.options.map((option) => {
          const selected = Array.isArray(value) && value.includes(option);
          return (
            <label
              key={option}
              className={`flex min-h-12 items-center gap-3 rounded-xl border px-4 ${selected ? 'border-blue-600 bg-blue-50' : 'bg-white'}`}
            >
              <input
                type="checkbox"
                checked={Boolean(selected)}
                onChange={() =>
                  onChange(
                    selected
                      ? (value as string[]).filter((item) => item !== option)
                      : [...(Array.isArray(value) ? value : []), option],
                  )
                }
                className="size-4"
              />
              <span>{option}</span>
            </label>
          );
        })}
      </div>
    );
  if (requirement.type === 'text')
    return (
      <Textarea
        value={String(value ?? '')}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-24 bg-white text-base"
        maxLength={500}
      />
    );
  return (
    <Input
      type={requirement.type === 'date' ? 'date' : 'number'}
      value={String(value ?? '')}
      onChange={(event) => onChange(event.target.value)}
      className="h-13 bg-white text-base"
    />
  );
}

function DocumentUpload({
  id,
  label,
  help,
  accept,
  file,
  onFile,
}: {
  id: string;
  label: string;
  help: string;
  accept: string;
  file: File | null;
  onFile: (file: File | null) => void;
}) {
  return (
    <div className="grid gap-2">
      <p className="text-sm font-semibold text-slate-800">
        {label} <span className="text-rose-600">*</span>
      </p>
      <label
        htmlFor={id}
        className={`flex min-h-28 cursor-pointer items-center gap-4 rounded-2xl border border-dashed p-4 transition ${file ? 'border-emerald-400 bg-emerald-50' : 'border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50'}`}
      >
        <span
          className={`grid size-11 shrink-0 place-items-center rounded-xl ${file ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-blue-700'}`}
        >
          {file ? (
            <FileCheck2 className="size-5" />
          ) : (
            <FileUp className="size-5" />
          )}
        </span>
        <span className="min-w-0">
          <span className="block truncate font-semibold text-slate-900">
            {file?.name || 'Choose a file'}
          </span>
          <span className="mt-1 block text-sm text-slate-600">
            {file ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : help}
          </span>
        </span>
      </label>
      <input
        id={id}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(event) => onFile(event.target.files?.[0] ?? null)}
      />
    </div>
  );
}

export default function RentalForm() {
  const [config, setConfig] = useState<PublicFormConfig | null>(null);
  const [form, setForm] = useState(initial);
  const [paystub, setPaystub] = useState<File | null>(null);
  const [driversLicense, setDriversLicense] = useState<File | null>(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [reference, setReference] = useState<number | null>(null);

  useEffect(() => {
    const slug = decodeURIComponent(location.pathname.split('/')[2] || '');
    void jsonRequest(
      `/api/public/form${slug ? `?slug=${encodeURIComponent(slug)}` : ''}`,
    )
      .then((data) => setConfig(data as unknown as PublicFormConfig))
      .catch((caught) =>
        setError(caught instanceof Error ? caught.message : 'Form unavailable'),
      )
      .finally(() => setLoading(false));
  }, []);

  const vendorRequirements = useMemo(
    () =>
      config?.requirements.filter(
        (requirement) => !customerApplicationKeys.has(requirement.key),
      ) ?? [],
    [config],
  );
  const requiredVendorAnswered = vendorRequirements
    .filter((requirement) => requirement.required)
    .every((requirement) => {
      const value = form.answers[requirement.key];
      return (
        value !== undefined &&
        value !== null &&
        value !== '' &&
        (!Array.isArray(value) || value.length > 0)
      );
    });
  const residence = String(form.answers.residence_type ?? '');
  const isHouse = residence === 'House';
  const validPersonal = Boolean(
    form.firstName.trim() &&
    form.lastName.trim() &&
    form.phone.replace(/\D/g, '').length >= 10 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) &&
    form.answers.date_of_birth,
  );
  const validAddress = Boolean(
    form.address.trim() &&
    form.city.trim() &&
    /^\d{5}(?:-\d{4})?$/.test(form.zip) &&
    residence &&
    (isHouse ||
      (String(form.answers.property_name ?? '').trim() &&
        String(form.answers.unit_number ?? '').trim())),
  );
  const validRental = Boolean(
    form.answers.rental_package &&
    form.answers.delivery_date &&
    requiredVendorAnswered,
  );
  const today = new Date().toISOString().slice(0, 10);
  const change = (key: keyof FormState, value: unknown) =>
    setForm((current) => ({ ...current, [key]: value }));
  const answer = (key: string, value: unknown) =>
    change('answers', { ...form.answers, [key]: value });

  const chooseFile = (kind: 'paystub' | 'license', file: File | null) => {
    setError('');
    if (!file) {
      if (kind === 'paystub') setPaystub(null);
      else setDriversLicense(null);
      return;
    }
    const allowed = kind === 'paystub' ? paystubTypes : licenseTypes;
    if (!allowed.has(file.type)) {
      setError(
        kind === 'paystub'
          ? 'Paystub must be a PDF, JPG, or PNG file.'
          : "Driver's license must be a JPG or PNG file.",
      );
      return;
    }
    if (file.size === 0 || file.size > maxFileBytes) {
      setError('Each supporting document must be 5 MB or smaller.');
      return;
    }
    if (kind === 'paystub') setPaystub(file);
    else setDriversLicense(file);
  };

  const submit = async () => {
    if (!config || !paystub || !driversLicense) return;
    setSending(true);
    setError('');
    try {
      const params = new URLSearchParams(location.search);
      const payload = {
        ...form,
        vendorSlug: config.vendorSlug,
        desiredTimeframe: String(form.answers.delivery_date ?? ''),
        availability: String(form.answers.delivery_time_slot ?? ''),
        landingPage: location.pathname,
        utmSource: params.get('utm_source') || '',
        utmMedium: params.get('utm_medium') || '',
        utmCampaign: params.get('utm_campaign') || '',
        utmContent: params.get('utm_content') || '',
        utmTerm: params.get('utm_term') || '',
        fbclid: params.get('fbclid') || '',
      };
      const body = new FormData();
      body.append('payload', JSON.stringify(payload));
      body.append('paystub', paystub);
      body.append('driversLicense', driversLicense);
      const data = await jsonRequest('/api/public/leads', {
        method: 'POST',
        body,
      });
      setReference(Number(data.reference));
      scrollTo({ top: 0, behavior: 'smooth' });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Could not submit your application',
      );
    } finally {
      setSending(false);
    }
  };

  if (loading)
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50">
        <LoaderCircle className="size-8 animate-spin text-blue-600" />
        <span className="sr-only">Loading rental application</span>
      </main>
    );
  if (reference)
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 px-5">
        <section className="w-full max-w-lg rounded-3xl border bg-white p-8 text-center shadow-xl shadow-slate-200/60">
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-100">
            <CheckCircle2 className="size-8 text-emerald-700" />
          </span>
          <h1 className="mt-6 text-2xl font-bold tracking-tight">
            Your rental application is in review.
          </h1>
          <p className="mt-3 text-base leading-7 text-slate-600">
            We received your information and supporting documents. We’ll check
            availability and contact you shortly.
          </p>
          <p className="mt-5 rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
            Application #{reference}
          </p>
        </section>
      </main>
    );
  if (!config)
    return (
      <main className="grid min-h-screen place-items-center px-5">
        <p className="max-w-md rounded-2xl border bg-white p-6 text-center text-slate-700">
          {error || 'This rental application is unavailable.'}
        </p>
      </main>
    );

  const stepLabels = [
    'Personal information',
    'Delivery address',
    'Rental details',
    'Documents & review',
  ];
  const canContinue =
    step === 1 ? validPersonal : step === 2 ? validAddress : validRental;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:py-10">
      <div className="mx-auto max-w-2xl">
        <header className="mb-6 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200">
            <WashingMachine className="size-6" />
          </span>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            {config.heading.replace('request', 'application')}
          </h1>
          <p className="mt-2 text-slate-600">
            Complete the application so our team can confirm rental and delivery
            availability.
          </p>
        </header>
        <section className="overflow-hidden rounded-3xl border bg-white shadow-xl shadow-slate-200/60">
          <div className="border-b px-5 py-4 sm:px-8">
            <div className="mb-2 flex justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
              <span>Step {step} of 4</span>
              <span>{stepLabels[step - 1]}</span>
            </div>
            <Progress value={(step / 4) * 100} />
          </div>
          <div className="p-5 sm:p-8">
            {error && (
              <div
                role="alert"
                className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
              >
                {error}
              </div>
            )}
            {step === 1 && (
              <div className="grid gap-5">
                <div>
                  <h2 className="text-xl font-bold">Personal information</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Enter the applicant’s contact details exactly as they should
                    appear on the rental application.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="First name">
                    <Input
                      required
                      autoComplete="given-name"
                      value={form.firstName}
                      onChange={(event) =>
                        change('firstName', event.target.value)
                      }
                      className="h-13 text-base"
                      maxLength={80}
                    />
                  </Field>
                  <Field label="Last name">
                    <Input
                      required
                      autoComplete="family-name"
                      value={form.lastName}
                      onChange={(event) =>
                        change('lastName', event.target.value)
                      }
                      className="h-13 text-base"
                      maxLength={80}
                    />
                  </Field>
                </div>
                <Field label="Email address">
                  <Input
                    required
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={(event) => change('email', event.target.value)}
                    className="h-13 text-base"
                    maxLength={160}
                  />
                </Field>
                <Field label="Phone number">
                  <Input
                    required
                    inputMode="tel"
                    autoComplete="tel"
                    value={form.phone}
                    onChange={(event) => change('phone', event.target.value)}
                    className="h-13 text-base"
                    placeholder="(214) 555-1234"
                    maxLength={25}
                  />
                </Field>
                <Field label="Date of birth">
                  <Input
                    required
                    type="date"
                    max={today}
                    value={String(form.answers.date_of_birth ?? '')}
                    onChange={(event) =>
                      answer('date_of_birth', event.target.value)
                    }
                    className="h-13 text-base"
                  />
                </Field>
              </div>
            )}
            {step === 2 && (
              <div className="grid gap-5">
                <div>
                  <h2 className="text-xl font-bold">Delivery address</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Tell us where the washer and dryer will be installed.
                  </p>
                </div>
                <Field label="Street address">
                  <Input
                    required
                    autoComplete="street-address"
                    value={form.address}
                    onChange={(event) => change('address', event.target.value)}
                    className="h-13 text-base"
                    maxLength={200}
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-[1.4fr_1fr]">
                  <Field label="City">
                    <Input
                      required
                      autoComplete="address-level2"
                      value={form.city}
                      onChange={(event) => change('city', event.target.value)}
                      className="h-13 text-base"
                      maxLength={100}
                    />
                  </Field>
                  <Field label="ZIP code">
                    <Input
                      required
                      inputMode="numeric"
                      autoComplete="postal-code"
                      value={form.zip}
                      onChange={(event) => change('zip', event.target.value)}
                      className="h-13 text-base"
                      maxLength={10}
                    />
                  </Field>
                </div>
                <div className="grid gap-2">
                  <p className="text-sm font-semibold text-slate-800">
                    Type of residence
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {['House', 'Apartment / townhome / condo'].map((option) => (
                      <label
                        key={option}
                        className={`flex min-h-13 items-center gap-3 rounded-xl border px-4 ${residence === option ? 'border-blue-600 bg-blue-50' : 'bg-white'}`}
                      >
                        <input
                          type="radio"
                          name="residence_type"
                          checked={residence === option}
                          onChange={() => answer('residence_type', option)}
                          className="size-4"
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                </div>
                {!isHouse && residence && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Apartment or property name">
                      <Input
                        required
                        value={String(form.answers.property_name ?? '')}
                        onChange={(event) =>
                          answer('property_name', event.target.value)
                        }
                        className="h-13 text-base"
                        maxLength={120}
                      />
                    </Field>
                    <Field label="Unit / apartment number">
                      <Input
                        required
                        value={String(form.answers.unit_number ?? '')}
                        onChange={(event) =>
                          answer('unit_number', event.target.value)
                        }
                        className="h-13 text-base"
                        maxLength={60}
                      />
                    </Field>
                  </div>
                )}
              </div>
            )}
            {step === 3 && (
              <div className="grid gap-6">
                <div>
                  <h2 className="text-xl font-bold">Rental and delivery</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Choose the package and tell us your preferred delivery
                    window.
                  </p>
                </div>
                <label className="flex items-start gap-3 rounded-2xl border border-blue-300 bg-blue-50 p-4">
                  <input
                    type="radio"
                    name="rental_package"
                    checked={
                      form.answers.rental_package === 'Washer & Dryer Set'
                    }
                    onChange={() =>
                      answer('rental_package', 'Washer & Dryer Set')
                    }
                    className="mt-1 size-4"
                  />
                  <span>
                    <span className="block font-semibold text-blue-950">
                      Washer & Dryer Set
                    </span>
                    <span className="mt-1 block text-sm leading-6 text-blue-900">
                      Standalone units for side-by-side or separated placement.
                      Stackable units are not currently offered.
                    </span>
                  </span>
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Preferred delivery date">
                    <Input
                      required
                      type="date"
                      min={today}
                      value={String(form.answers.delivery_date ?? '')}
                      onChange={(event) =>
                        answer('delivery_date', event.target.value)
                      }
                      className="h-13 text-base"
                    />
                  </Field>
                  <Field label="Preferred time slot" optional>
                    <select
                      value={String(form.answers.delivery_time_slot ?? '')}
                      onChange={(event) =>
                        answer('delivery_time_slot', event.target.value)
                      }
                      className="h-13 rounded-lg border border-input bg-white px-3 text-base outline-none focus:border-ring focus:ring-3 focus:ring-ring/20"
                    >
                      <option value="">Select a time</option>
                      <option>Morning (8 AM - 12 PM)</option>
                      <option>Afternoon (12 PM - 5 PM)</option>
                    </select>
                  </Field>
                </div>
                <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                  Your preferred date is a request, not a confirmed appointment.
                  Our team will verify availability before scheduling delivery.
                </p>
                {vendorRequirements.map((requirement) => (
                  <div
                    key={requirement.key}
                    className="grid gap-2 rounded-2xl bg-slate-50 p-4"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">
                        {requirement.question}
                        {requirement.required && (
                          <span className="ml-1 text-rose-600">*</span>
                        )}
                      </p>
                      {requirement.description && (
                        <p className="mt-1 text-sm text-slate-600">
                          {requirement.description}
                        </p>
                      )}
                    </div>
                    <RequirementControl
                      requirement={requirement}
                      value={form.answers[requirement.key]}
                      onChange={(value) => answer(requirement.key, value)}
                    />
                  </div>
                ))}
                <Field label="Additional notes" optional>
                  <Textarea
                    value={String(form.answers.additional_notes ?? '')}
                    onChange={(event) =>
                      answer('additional_notes', event.target.value)
                    }
                    placeholder="Gate code, stairs, access notes, or anything else…"
                    className="min-h-24 text-base"
                    maxLength={500}
                  />
                </Field>
                <div className="absolute -left-[10000px]" aria-hidden="true">
                  <Input
                    aria-label="Website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={form.websiteField}
                    onChange={(event) =>
                      change('websiteField', event.target.value)
                    }
                  />
                </div>
              </div>
            )}
            {step === 4 && (
              <div className="grid gap-6">
                <div>
                  <h2 className="text-xl font-bold">Supporting documents</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Upload the two documents needed for the approval review.
                  </p>
                </div>
                <DocumentUpload
                  id="paystub"
                  label="Recent paystub"
                  help="PDF, JPG, or PNG · maximum 5 MB"
                  accept="application/pdf,image/jpeg,image/png"
                  file={paystub}
                  onFile={(file) => chooseFile('paystub', file)}
                />
                <DocumentUpload
                  id="drivers-license"
                  label="Driver’s license (front side)"
                  help="JPG or PNG · maximum 5 MB"
                  accept="image/jpeg,image/png"
                  file={driversLicense}
                  onFile={(file) => chooseFile('license', file)}
                />
                <div className="flex items-start gap-3 rounded-2xl bg-blue-50 p-4 text-sm leading-6 text-blue-950">
                  <LockKeyhole className="mt-0.5 size-5 shrink-0" />
                  <p>
                    Documents are stored separately from the application record
                    and can only be downloaded by authenticated RelayRoute
                    staff.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-950">Review</h3>
                  <dl className="mt-3 grid gap-3 rounded-2xl bg-slate-50 p-5 text-sm">
                    <div>
                      <dt className="text-slate-500">Applicant</dt>
                      <dd className="font-semibold">
                        {form.firstName} {form.lastName}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Contact</dt>
                      <dd className="font-semibold">
                        {form.phone} · {form.email}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Delivery address</dt>
                      <dd className="font-semibold">
                        {form.address}
                        {form.answers.unit_number
                          ? `, Unit ${String(form.answers.unit_number)}`
                          : ''}
                        , {form.city}, {form.zip}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Package and timing</dt>
                      <dd className="font-semibold">
                        Washer & Dryer Set ·{' '}
                        {String(form.answers.delivery_date)}
                        {form.answers.delivery_time_slot
                          ? ` · ${String(form.answers.delivery_time_slot)}`
                          : ''}
                      </dd>
                    </div>
                  </dl>
                </div>
                <label className="flex cursor-pointer gap-3 rounded-2xl border p-4 text-sm leading-6">
                  <input
                    type="checkbox"
                    checked={form.consent}
                    onChange={(event) =>
                      change('consent', event.target.checked)
                    }
                    className="mt-1 size-5 shrink-0"
                  />
                  <span>
                    I certify that this information is accurate and agree to be
                    contacted by phone or text about washer/dryer rental
                    availability. Message and data rates may apply.
                  </span>
                </label>
              </div>
            )}
            <div className="mt-8 flex gap-3">
              {step > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  className="h-13 flex-1 text-base"
                  onClick={() => setStep(step - 1)}
                >
                  <ChevronLeft />
                  Back
                </Button>
              )}
              {step < 4 ? (
                <Button
                  type="button"
                  className="h-13 flex-1 bg-blue-600 text-base text-white hover:bg-blue-700"
                  disabled={!canContinue}
                  onClick={() => {
                    setError('');
                    setStep(step + 1);
                  }}
                >
                  Continue
                  <ChevronRight />
                </Button>
              ) : (
                <Button
                  type="button"
                  className="h-13 flex-1 bg-blue-600 text-base text-white hover:bg-blue-700"
                  disabled={
                    !form.consent || !paystub || !driversLicense || sending
                  }
                  onClick={() => void submit()}
                >
                  {sending ? (
                    <LoaderCircle className="animate-spin" />
                  ) : (
                    <Check />
                  )}
                  {sending ? 'Sending…' : 'Submit application'}
                </Button>
              )}
            </div>
          </div>
        </section>
        <p className="mt-5 text-center text-xs text-slate-500">
          RelayRoute secure rental intake
        </p>
      </div>
    </main>
  );
}
