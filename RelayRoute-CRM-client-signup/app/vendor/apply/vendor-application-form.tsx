'use client';

import { useState } from 'react';
import {
  Building2,
  CheckCircle2,
  LoaderCircle,
  Plus,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { VendorApplicationRequirement } from '@/lib/types';

const blankRequirement: VendorApplicationRequirement = {
  name: '',
  question: '',
  type: 'boolean',
  required: true,
  options: ['Yes', 'No'],
  qualifying: ['Yes'],
  disqualifying: ['No'],
  description: '',
};
const initial = {
  companyName: '',
  contactName: '',
  phone: '',
  email: '',
  website: '',
  primaryMarket: '',
  zips: '',
  cities: '',
  maxLeadsDay: 5,
  maxLeadsWeek: 25,
  installsDay: 3,
  installsWeek: 15,
  deliveryDays: 'Monday–Saturday',
  acceptingNewCustomers: true,
  customerMonthlyPrice: 85,
  deliveryFee: 0,
  installationFee: 0,
  depositAmount: 0,
  minimumTermMonths: 3,
  supportsElectric: true,
  supportsGas: false,
  stackableAvailable: false,
  stairsAllowed: true,
  maxFlights: 1,
  recurringRevenue: 0,
  oneTimeRevenue: 0,
  revenueModel: 'recurring',
  paymentNotes: '',
  websiteField: '',
  requirements: [] as VendorApplicationRequirement[],
};
const Field = ({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) => (
  <label className="grid gap-2 text-sm font-semibold text-slate-800">
    {label}
    {children}
    {hint && <span className="text-xs font-normal text-slate-500">{hint}</span>}
  </label>
);
const Toggle = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) => (
  <button
    type="button"
    onClick={() => onChange(!value)}
    className={`flex min-h-12 items-center justify-between rounded-xl border px-4 text-left text-sm font-semibold ${value ? 'border-blue-600 bg-blue-50 text-blue-900' : 'bg-white text-slate-600'}`}
  >
    <span>{label}</span>
    <span
      className={`rounded-full px-2 py-1 text-xs ${value ? 'bg-blue-600 text-white' : 'bg-slate-100'}`}
    >
      {value ? 'Yes' : 'No'}
    </span>
  </button>
);

export default function VendorApplicationForm() {
  const [form, setForm] = useState(initial);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const set = <K extends keyof typeof initial>(
    key: K,
    value: (typeof initial)[K],
  ) => setForm({ ...form, [key]: value });
  const addRequirement = () =>
    set('requirements', [
      ...form.requirements,
      {
        ...blankRequirement,
        options: [...blankRequirement.options],
        qualifying: [...blankRequirement.qualifying],
        disqualifying: [...blankRequirement.disqualifying],
      },
    ]);
  const updateRequirement = (
    index: number,
    fields: Partial<VendorApplicationRequirement>,
  ) =>
    set(
      'requirements',
      form.requirements.map((item, i) =>
        i === index ? { ...item, ...fields } : item,
      ),
    );
  const submit = async () => {
    setSending(true);
    setError('');
    try {
      const response = await fetch('/api/public/vendor-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok)
        throw new Error(data.error || 'Could not submit application');
      setDone(true);
      scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not submit application');
    } finally {
      setSending(false);
    }
  };
  if (done)
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 px-5">
        <section className="max-w-xl rounded-3xl border bg-white p-9 text-center shadow-xl">
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-100">
            <CheckCircle2 className="size-8 text-emerald-700" />
          </span>
          <h1 className="mt-6 text-2xl font-bold">Application received</h1>
          <p className="mt-3 leading-7 text-slate-600">
            Thanks for sharing your service information. RelayRoute will review
            it before any vendor profile is created or any lead can be routed to
            your business.
          </p>
        </section>
      </main>
    );
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-7 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-slate-950 text-white">
            <Building2 className="size-6" />
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight">
            Partner with RelayRoute
          </h1>
          <p className="mx-auto mt-2 max-w-2xl text-slate-600">
            Tell us how your washer and dryer rental business operates. We
            review every application before adding a vendor to our network.
          </p>
        </header>
        <div className="grid gap-5">
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
            >
              {error}
            </div>
          )}
          <Section
            title="Basic information"
            description="Your company and primary contact."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Company name">
                <Input
                  required
                  value={form.companyName}
                  onChange={(e) => set('companyName', e.target.value)}
                  className="h-12"
                />
              </Field>
              <Field label="Contact name">
                <Input
                  required
                  value={form.contactName}
                  onChange={(e) => set('contactName', e.target.value)}
                  className="h-12"
                />
              </Field>
              <Field label="Phone">
                <Input
                  required
                  inputMode="tel"
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  className="h-12"
                />
              </Field>
              <Field label="Email">
                <Input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  className="h-12"
                />
              </Field>
              <Field label="Website">
                <Input
                  type="url"
                  value={form.website}
                  onChange={(e) => set('website', e.target.value)}
                  className="h-12"
                />
              </Field>
              <Field label="Primary city / market">
                <Input
                  value={form.primaryMarket}
                  onChange={(e) => set('primaryMarket', e.target.value)}
                  className="h-12"
                />
              </Field>
            </div>
          </Section>
          <Section
            title="Service area"
            description="Use exact 5-digit ZIP codes so we can match customers accurately."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="ZIP codes served" hint="Comma or space separated">
                <Textarea
                  required
                  value={form.zips}
                  onChange={(e) => set('zips', e.target.value)}
                  placeholder="75060, 75061, 75062"
                  className="min-h-28"
                />
              </Field>
              <Field label="Cities served">
                <Textarea
                  value={form.cities}
                  onChange={(e) => set('cities', e.target.value)}
                  placeholder="Irving, Grand Prairie…"
                  className="min-h-28"
                />
              </Field>
            </div>
          </Section>
          <Section
            title="Capacity"
            description="These limits help avoid sending more opportunities than you can handle."
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <NumberField
                label="Max leads / day"
                value={form.maxLeadsDay}
                onChange={(value) => set('maxLeadsDay', value)}
              />
              <NumberField
                label="Max leads / week"
                value={form.maxLeadsWeek}
                onChange={(value) => set('maxLeadsWeek', value)}
              />
              <NumberField
                label="Installs / day"
                value={form.installsDay}
                onChange={(value) => set('installsDay', value)}
              />
              <NumberField
                label="Installs / week"
                value={form.installsWeek}
                onChange={(value) => set('installsWeek', value)}
              />
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Typical delivery days">
                <Input
                  value={form.deliveryDays}
                  onChange={(e) => set('deliveryDays', e.target.value)}
                  className="h-12"
                />
              </Field>
              <Toggle
                label="Currently accepting customers"
                value={form.acceptingNewCustomers}
                onChange={(value) => set('acceptingNewCustomers', value)}
              />
            </div>
          </Section>
          <Section
            title="Pricing"
            description="Enter customer-facing rental and delivery terms."
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <NumberField
                label="Monthly price"
                value={form.customerMonthlyPrice}
                onChange={(value) => set('customerMonthlyPrice', value)}
              />
              <NumberField
                label="Delivery fee"
                value={form.deliveryFee}
                onChange={(value) => set('deliveryFee', value)}
              />
              <NumberField
                label="Installation fee"
                value={form.installationFee}
                onChange={(value) => set('installationFee', value)}
              />
              <NumberField
                label="Deposit"
                value={form.depositAmount}
                onChange={(value) => set('depositAmount', value)}
              />
              <NumberField
                label="Minimum months"
                value={form.minimumTermMonths}
                onChange={(value) => set('minimumTermMonths', value)}
              />
            </div>
          </Section>
          <Section
            title="Equipment & delivery"
            description="Tell us which homes and equipment your team can support."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Toggle
                label="Electric dryers supported"
                value={form.supportsElectric}
                onChange={(value) => set('supportsElectric', value)}
              />
              <Toggle
                label="Gas dryers supported"
                value={form.supportsGas}
                onChange={(value) => set('supportsGas', value)}
              />
              <Toggle
                label="Stackable units available"
                value={form.stackableAvailable}
                onChange={(value) => set('stackableAvailable', value)}
              />
              <Toggle
                label="Stairs allowed"
                value={form.stairsAllowed}
                onChange={(value) => set('stairsAllowed', value)}
              />
            </div>
            {form.stairsAllowed && (
              <div className="mt-4 max-w-xs">
                <NumberField
                  label="Maximum flights of stairs"
                  value={form.maxFlights}
                  onChange={(value) => set('maxFlights', value)}
                />
              </div>
            )}
          </Section>
          <Section
            title="Partnership / referral"
            description="This information is private and reviewed internally."
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Revenue structure">
                <Select
                  value={form.revenueModel}
                  onValueChange={(value) => set('revenueModel', String(value))}
                >
                  <SelectTrigger className="h-12 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recurring">Recurring amount</SelectItem>
                    <SelectItem value="one_time">One-time amount</SelectItem>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <NumberField
                label="Recurring amount"
                value={form.recurringRevenue}
                onChange={(value) => set('recurringRevenue', value)}
              />
              <NumberField
                label="One-time amount"
                value={form.oneTimeRevenue}
                onChange={(value) => set('oneTimeRevenue', value)}
              />
            </div>
            <div className="mt-4">
              <Field label="Payment arrangement notes">
                <Textarea
                  value={form.paymentNotes}
                  onChange={(e) => set('paymentNotes', e.target.value)}
                  className="min-h-24"
                />
              </Field>
            </div>
          </Section>
          <Section
            title="Customer requirements"
            description="Add the questions you need answered before accepting a customer."
          >
            <div className="grid gap-4">
              {form.requirements.map((requirement, index) => (
                <div key={index} className="rounded-2xl border bg-slate-50 p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="font-semibold">Requirement {index + 1}</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        set(
                          'requirements',
                          form.requirements.filter((_, i) => i !== index),
                        )
                      }
                    >
                      <Trash2 />
                      Remove
                    </Button>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="What do you need to know?">
                      <Input
                        value={requirement.name}
                        onChange={(e) =>
                          updateRequirement(index, { name: e.target.value })
                        }
                        placeholder="Electric dryer hookup"
                      />
                    </Field>
                    <Field label="Customer-facing question">
                      <Input
                        value={requirement.question}
                        onChange={(e) =>
                          updateRequirement(index, { question: e.target.value })
                        }
                        placeholder="Do you have an electric dryer hookup?"
                      />
                    </Field>
                    <Field label="Answer type">
                      <Select
                        value={requirement.type}
                        onValueChange={(value) =>
                          updateRequirement(index, {
                            type: String(
                              value,
                            ) as VendorApplicationRequirement['type'],
                          })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[
                            ['boolean', 'Yes / No'],
                            ['single_select', 'Choose one'],
                            ['multi_select', 'Choose several'],
                            ['text', 'Written answer'],
                            ['number', 'Number'],
                            ['date', 'Date'],
                          ].map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Toggle
                      label="Answer required"
                      value={requirement.required}
                      onChange={(value) =>
                        updateRequirement(index, { required: value })
                      }
                    />
                    <Field label="Possible answers" hint="Comma separated">
                      <Input
                        value={requirement.options.join(', ')}
                        onChange={(e) =>
                          updateRequirement(index, {
                            options: e.target.value
                              .split(',')
                              .map((v) => v.trim())
                              .filter(Boolean),
                          })
                        }
                      />
                    </Field>
                    <Field
                      label="Which answers qualify?"
                      hint="Comma separated"
                    >
                      <Input
                        value={requirement.qualifying.join(', ')}
                        onChange={(e) =>
                          updateRequirement(index, {
                            qualifying: e.target.value
                              .split(',')
                              .map((v) => v.trim())
                              .filter(Boolean),
                          })
                        }
                      />
                    </Field>
                    <Field
                      label="Which answers disqualify?"
                      hint="Comma separated"
                    >
                      <Input
                        value={requirement.disqualifying.join(', ')}
                        onChange={(e) =>
                          updateRequirement(index, {
                            disqualifying: e.target.value
                              .split(',')
                              .map((v) => v.trim())
                              .filter(Boolean),
                          })
                        }
                      />
                    </Field>
                    <Field label="Helpful description">
                      <Input
                        value={requirement.description}
                        onChange={(e) =>
                          updateRequirement(index, {
                            description: e.target.value,
                          })
                        }
                      />
                    </Field>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                className="h-12"
                onClick={addRequirement}
              >
                <Plus />
                Add customer requirement
              </Button>
            </div>
          </Section>
          <div className="absolute -left-[10000px]" aria-hidden="true">
            <Input
              aria-label="Website"
              tabIndex={-1}
              autoComplete="off"
              value={form.websiteField}
              onChange={(e) => set('websiteField', e.target.value)}
            />
          </div>
          <div className="rounded-2xl border bg-white p-5">
            <p className="text-sm text-slate-600">
              Submitting does not immediately activate a vendor account.
              RelayRoute reviews every application first.
            </p>
            <Button
              className="mt-4 h-13 w-full bg-blue-600 text-base text-white hover:bg-blue-700"
              disabled={
                sending ||
                !form.companyName ||
                !form.contactName ||
                form.phone.replace(/\D/g, '').length < 10 ||
                !form.email ||
                !form.zips
              }
              onClick={() => void submit()}
            >
              {sending ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <Building2 />
              )}
              {sending ? 'Submitting…' : 'Submit partner application'}
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border bg-white p-5 shadow-sm sm:p-7">
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="mb-5 mt-1 text-sm text-slate-600">{description}</p>
      {children}
    </section>
  );
}
function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <Field label={label}>
      <Input
        type="number"
        min="0"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-12"
      />
    </Field>
  );
}
