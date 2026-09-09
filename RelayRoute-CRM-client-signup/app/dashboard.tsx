'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AppWindow,
  BadgeDollarSign,
  BarChart3,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  CircleGauge,
  Clipboard,
  Download,
  FileText,
  LayoutDashboard,
  LoaderCircle,
  MapPinOff,
  Menu,
  MessageCircle,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Settings2,
  Store,
  UsersRound,
  XCircle,
  Inbox,
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import type {
  AppState,
  Lead,
  Requirement,
  RoutingSettings,
  Vendor,
  VendorApplication,
  VendorMatch,
} from '@/lib/types';
import { generateFollowup, routeLead } from '@/lib/routing';
import { customerApplicationLabels } from '@/lib/customer-application';

type View =
  | 'dashboard'
  | 'leads'
  | 'vendors'
  | 'applications'
  | 'reports'
  | 'settings';
const statusLabels: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualifying: 'Qualifying',
  needs_information: 'Needs information',
  qualified: 'Qualified',
  pending_approval: 'Awaiting approval',
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  vendor_selected: 'Vendor selected',
  sent_to_vendor: 'Sent to vendor',
  signup_started: 'Signup started',
  signup_completed: 'Signup completed',
  converted: 'Converted',
  delivery_scheduled: 'Delivery scheduled',
  installed: 'Installed',
  lost: 'Lost',
  unqualified: 'Unqualified',
  no_vendor_available: 'No vendor available',
  no_response: 'No response',
};
const statusTone: Record<string, string> = {
  converted: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
  installed: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
  qualified: 'bg-sky-50 text-sky-700 ring-sky-600/15',
  vendor_selected: 'bg-blue-50 text-blue-700 ring-blue-600/15',
  sent_to_vendor: 'bg-indigo-50 text-indigo-700 ring-indigo-600/15',
  signup_started: 'bg-violet-50 text-violet-700 ring-violet-600/15',
  signup_completed: 'bg-violet-50 text-violet-700 ring-violet-600/15',
  lost: 'bg-rose-50 text-rose-700 ring-rose-600/15',
  unqualified: 'bg-rose-50 text-rose-700 ring-rose-600/15',
  no_vendor_available: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  needs_information: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  pending_approval: 'bg-orange-50 text-orange-800 ring-orange-600/20',
  approved: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
  rejected: 'bg-rose-50 text-rose-700 ring-rose-600/15',
};
const nav: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'leads', label: 'Leads', icon: UsersRound },
  { id: 'vendors', label: 'Vendors', icon: Store },
  { id: 'applications', label: 'Vendor applications', icon: Inbox },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'settings', label: 'Routing settings', icon: Settings2 },
];
const today = () => new Date().toISOString().slice(0, 10);
const money = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
const normalize = (value: string) => value.replace(/\D/g, '');
const formatPhone = (value: string) =>
  value.length === 10
    ? '(' + value.slice(0, 3) + ') ' + value.slice(3, 6) + '-' + value.slice(6)
    : value;
const displayDate = (value: string) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
const cx = (...values: (string | false | undefined)[]) =>
  values.filter(Boolean).join(' ');

function Badge({ status }: { status: string }) {
  return (
    <span
      className={cx(
        'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset',
        statusTone[status] || 'bg-slate-100 text-slate-700 ring-slate-500/15',
      )}
    >
      {statusLabels[status] || status}
    </span>
  );
}
function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      {label}
      {children}
      {hint && (
        <span className="text-xs font-normal text-muted-foreground">
          {hint}
        </span>
      )}
    </label>
  );
}
async function requestJson(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json' },
  });
  const data = (await response.json()) as Record<string, unknown>;
  if (!response.ok)
    throw new Error(
      typeof data.error === 'string' ? data.error : 'Something went wrong',
    );
  return data;
}

export default function DashboardApp({ displayName }: { displayName: string }) {
  const [data, setData] = useState<AppState | null>(null);
  const [view, setView] = useState<View>('dashboard');
  const [query, setQuery] = useState('');
  const [newLeadOpen, setNewLeadOpen] = useState(false);
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null);
  const [activeVendorId, setActiveVendorId] = useState<string | null>(null);
  const [newVendorOpen, setNewVendorOpen] = useState(false);
  const [activeApplicationId, setActiveApplicationId] = useState<string | null>(
    null,
  );
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    try {
      setData((await requestJson('/api/state')) as unknown as AppState);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load workspace');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 2400);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: unknown,
            options?: { signal?: AbortSignal },
          ) => unknown;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    try {
      void Promise.resolve(
        context.registerTool(
          {
            name: 'start_new_lead',
            title: 'Start a new lead',
            description:
              'Open the fast lead capture form for a washer or dryer rental customer.',
            inputSchema: {
              type: 'object',
              properties: {},
              additionalProperties: false,
            },
            annotations: { readOnlyHint: false, untrustedContentHint: false },
            execute: async () => {
              setView('dashboard');
              setNewLeadOpen(true);
              return { opened: true };
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch(() => undefined);
    } catch {}
    return () => lifecycle.abort();
  }, []);
  const filtered = useMemo(() => {
    if (!data) return [];
    const needle = query.trim().toLowerCase();
    if (!needle) return data.leads;
    return data.leads.filter((lead) => {
      const vendor =
        data.vendors.find((item) => item.id === lead.assignedVendorId)?.name ||
        '';
      return [
        lead.firstName,
        lead.lastName,
        lead.phone,
        formatPhone(lead.phone),
        lead.zip,
        lead.city,
        String(lead.displayId),
        vendor,
      ]
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });
  }, [data, query]);
  const activeLead =
    data?.leads.find((lead) => lead.id === activeLeadId) || null;
  const activeVendor =
    data?.vendors.find((vendor) => vendor.id === activeVendorId) || null;
  const showToast = (message: string) => {
    setToast(message);
    setError('');
  };

  return (
    <SidebarProvider>
      <Sidebar collapsible="offcanvas" className="border-r">
        <SidebarHeader className="px-4 py-5">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-sidebar-primary text-white shadow-lg shadow-blue-950/30">
              <AppWindow className="size-5" />
            </span>
            <div>
              <p className="text-[15px] font-semibold tracking-tight">
                RelayRoute
              </p>
              <p className="text-xs text-slate-400">Rental lead desk</p>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {nav.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      isActive={view === item.id}
                      onClick={() => setView(item.id)}
                      className="h-10 gap-3 px-3"
                    >
                      <item.icon />
                      <span>{item.label}</span>
                      {item.id === 'leads' && (
                        <span className="ml-auto rounded-full bg-slate-700 px-2 py-0.5 text-xs">
                          {data?.leads.length || 0}
                        </span>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="p-4">
          <div className="rounded-xl border border-slate-700/70 bg-slate-800/50 p-3">
            <p className="truncate text-sm font-medium">{displayName}</p>
            <p className="mt-0.5 text-xs text-slate-400">Private workspace</p>
            <a
              href="/signout-with-chatgpt?return_to=/"
              target="_top"
              className="mt-2 inline-block text-xs text-sky-400 hover:underline"
            >
              Sign out
            </a>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="min-w-0 bg-transparent">
        <header className="sticky top-0 z-30 flex h-20 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur sm:px-6 lg:px-9">
          <SidebarTrigger className="md:hidden">
            <Menu />
          </SidebarTrigger>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[.08em] text-muted-foreground">
              {new Intl.DateTimeFormat('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
              }).format(new Date())}
            </p>
            <h1 className="truncate text-xl font-semibold tracking-tight">
              {nav.find((item) => item.id === view)?.label}
            </h1>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search leads"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search name, phone, ZIP, lead…"
                className="h-11 w-72 bg-card pl-9"
              />
            </div>
            <Button
              onClick={() => setNewLeadOpen(true)}
              className="h-11 bg-blue-600 px-4 text-white shadow-sm hover:bg-blue-700"
            >
              <Plus />
              <span className="hidden xs:inline">New lead</span>
            </Button>
          </div>
        </header>
        <div className="mx-auto w-full max-w-[1460px] px-4 py-6 sm:px-6 lg:px-9">
          <div className="relative mb-4 sm:hidden">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search leads"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search leads…"
              className="h-11 bg-card pl-9"
            />
          </div>
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              <CircleAlert className="size-4" />
              {error}
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto"
                onClick={() => void refresh()}
              >
                <RotateCcw />
                Retry
              </Button>
            </div>
          )}
          {loading ? (
            <Loading />
          ) : (
            data && (
              <>
                {view === 'dashboard' && (
                  <DashboardView
                    data={data}
                    onOpenLead={setActiveLeadId}
                    onNewLead={() => setNewLeadOpen(true)}
                  />
                )}
                {view === 'leads' && (
                  <LeadsView
                    data={data}
                    leads={filtered}
                    onOpenLead={setActiveLeadId}
                  />
                )}
                {view === 'vendors' && (
                  <VendorsView
                    data={data}
                    onOpenVendor={setActiveVendorId}
                    onNewVendor={() => setNewVendorOpen(true)}
                  />
                )}
                {view === 'applications' && (
                  <VendorApplicationsView
                    applications={data.vendorApplications}
                    onOpen={setActiveApplicationId}
                  />
                )}
                {view === 'reports' && <ReportsView data={data} />}
                {view === 'settings' && (
                  <SettingsView
                    settings={data.settings}
                    onSaved={() => {
                      void refresh();
                      showToast('Routing weights saved');
                    }}
                    onError={setError}
                  />
                )}
              </>
            )
          )}
        </div>
      </SidebarInset>
      {data && (
        <NewLeadDialog
          open={newLeadOpen}
          onOpenChange={setNewLeadOpen}
          leads={data.leads}
          onCreated={async (id) => {
            await refresh();
            setNewLeadOpen(false);
            setActiveLeadId(id);
            showToast('Lead created and routed');
          }}
          onError={setError}
        />
      )}
      {data && activeLead && (
        <LeadDialog
          lead={activeLead}
          data={data}
          open={Boolean(activeLead)}
          onOpenChange={(open) => !open && setActiveLeadId(null)}
          refresh={refresh}
          toast={showToast}
          onError={setError}
        />
      )}
      {data && activeVendor && (
        <VendorDialog
          vendor={activeVendor}
          open={Boolean(activeVendor)}
          onOpenChange={(open) => !open && setActiveVendorId(null)}
          refresh={refresh}
          toast={showToast}
          onError={setError}
        />
      )}
      {data && (
        <NewVendorDialog
          open={newVendorOpen}
          onOpenChange={setNewVendorOpen}
          onCreated={async () => {
            await refresh();
            setNewVendorOpen(false);
            showToast('Vendor created');
          }}
          onError={setError}
        />
      )}
      {data && activeApplicationId && (
        <VendorApplicationDialog
          application={data.vendorApplications.find(
            (item) => item.id === activeApplicationId,
          )!}
          open={true}
          onOpenChange={(open) => !open && setActiveApplicationId(null)}
          refresh={refresh}
          toast={showToast}
          onError={setError}
        />
      )}
      {toast && (
        <div
          role="status"
          className="fixed bottom-5 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-medium text-white shadow-xl"
        >
          <Check className="size-4 text-emerald-400" />
          {toast}
        </div>
      )}
    </SidebarProvider>
  );
}

function Loading() {
  return (
    <div className="grid min-h-[50vh] place-items-center">
      <div className="text-center">
        <LoaderCircle className="mx-auto size-7 animate-spin text-blue-600" />
        <p className="mt-3 text-sm text-muted-foreground">
          Loading your lead desk…
        </p>
      </div>
    </div>
  );
}
function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div
      className={cx(
        'rounded-xl p-3',
        tone === 'danger' ? 'bg-rose-50' : 'bg-muted/60',
      )}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cx(
          'mt-1 font-semibold',
          tone === 'danger' && 'text-rose-700',
        )}
      >
        {value}
      </p>
    </div>
  );
}
function Empty({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Search;
  title: string;
  body: string;
}) {
  return (
    <div className="grid place-items-center px-5 py-10 text-center">
      <Icon className="size-7 text-muted-foreground" />
      <p className="mt-3 font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function DashboardView({
  data,
  onOpenLead,
  onNewLead,
}: {
  data: AppState;
  onOpenLead: (id: string) => void;
  onNewLead: () => void;
}) {
  const converted = data.leads.filter((lead) =>
    ['converted', 'delivery_scheduled', 'installed'].includes(lead.status),
  );
  const awaiting = data.leads.filter(
    (lead) => lead.status === 'pending_approval',
  );
  const attention = data.leads
    .filter((lead) =>
      [
        'new',
        'qualifying',
        'needs_information',
        'pending_approval',
        'vendor_selected',
        'sent_to_vendor',
        'no_vendor_available',
      ].includes(lead.status),
    )
    .slice(0, 5);
  const unserved = Object.entries(
    data.leads
      .filter((lead) => lead.status === 'no_vendor_available')
      .reduce<Record<string, number>>(
        (map, lead) => ({ ...map, [lead.zip]: (map[lead.zip] || 0) + 1 }),
        {},
      ),
  ).sort((a, b) => b[1] - a[1]);
  const todayLeads = data.leads.filter(
    (lead) => lead.createdAt.slice(0, 10) === today(),
  );
  const metrics = [
    ['Leads submitted', todayLeads.length, 'Today'],
    ['Awaiting approval', awaiting.length, 'Needs review'],
    [
      'Sent to vendors',
      data.leads.filter((lead) => lead.sentAt?.slice(0, 10) === today()).length,
      'Today',
    ],
    [
      'Converted',
      converted.length,
      money(
        converted.reduce((sum, lead) => sum + lead.expectedMonthlyRevenue, 0),
      ) + ' MRR',
    ],
    [
      'No vendor available',
      todayLeads.filter((lead) => lead.status === 'no_vendor_available').length,
      'Today',
    ],
  ];
  return (
    <>
      <section className="mb-6 overflow-hidden rounded-2xl border border-orange-200 bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-orange-100 bg-orange-50 px-5 py-4">
          <div>
            <h2 className="font-semibold text-orange-950">Awaiting Approval</h2>
            <p className="text-sm text-orange-800">
              {awaiting.length} public lead{awaiting.length === 1 ? '' : 's'}{' '}
              ready for routing review
            </p>
          </div>
          <Inbox className="size-5 text-orange-700" />
        </div>
        {awaiting.length ? (
          <div className="divide-y">
            {awaiting.slice(0, 8).map((lead) => {
              const intended = data.vendors.find(
                (v) => v.id === lead.landingVendorId,
              );
              const recommended = data.vendors.find(
                (v) => v.id === lead.recommendedVendorId,
              );
              const match = routeLead(
                lead,
                data.vendors,
                data.leads,
                data.settings,
              ).find((m) => m.vendor.id === lead.recommendedVendorId);
              const missing =
                match?.requirements.filter(
                  (item) =>
                    item.state === 'missing' && item.requirement.required,
                ).length ?? 0;
              return (
                <button
                  key={lead.id}
                  onClick={() => onOpenLead(lead.id)}
                  className="grid w-full gap-3 px-5 py-4 text-left hover:bg-muted/40 lg:grid-cols-[1.3fr_1fr_1fr_1fr_auto]"
                >
                  <div>
                    <p className="font-semibold">
                      {lead.firstName} {lead.lastName}{' '}
                      <span className="font-normal text-muted-foreground">
                        · #{lead.displayId}
                      </span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatPhone(lead.phone)} · ZIP {lead.zip}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Source / campaign
                    </p>
                    <p className="truncate text-sm font-medium">
                      {lead.source}
                      {lead.campaign ? ` · ${lead.campaign}` : ''}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Intended → recommended
                    </p>
                    <p className="truncate text-sm font-medium">
                      {intended?.name || 'Generic'} →{' '}
                      {recommended?.name || 'None'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Routing</p>
                    <p className="text-sm font-medium">
                      {lead.recommendationScore}/100 · {missing} missing ·{' '}
                      {match?.remainingToday ?? 0} open
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge status={lead.status} />
                    <ChevronRight className="size-4" />
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <Empty
            icon={CheckCircle2}
            title="Approval queue is clear"
            body="New public leads will appear here before vendor delivery."
          />
        )}
      </section>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {metrics.map(([label, value, note]) => (
          <article
            key={String(label)}
            className="rounded-2xl border bg-card p-5 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <p className="text-sm font-medium text-muted-foreground">
                {label}
              </p>
              <span className="rounded-full bg-sky-50 px-2 py-1 text-xs font-medium text-sky-700">
                {note}
              </span>
            </div>
            <p className="mt-5 text-3xl font-semibold tracking-tight">
              {value}
            </p>
          </article>
        ))}
      </section>
      <section className="mt-6 rounded-2xl border bg-card p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[.1em] text-muted-foreground">
          Pipeline
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
          {[
            'new',
            'needs_information',
            'pending_approval',
            'vendor_selected',
            'sent_to_vendor',
            'converted',
            'installed',
            'lost',
          ].map((status) => (
            <div key={status} className="rounded-xl bg-muted/60 p-3">
              <p className="text-lg font-semibold">
                {data.leads.filter((lead) => lead.status === status).length}
              </p>
              <p className="text-xs text-muted-foreground">
                {statusLabels[status]}
              </p>
            </div>
          ))}
        </div>
      </section>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
        <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div>
              <h2 className="font-semibold">Leads needing attention</h2>
              <p className="text-sm text-muted-foreground">
                Open a lead to take the next action
              </p>
            </div>
            <Button variant="ghost" onClick={onNewLead}>
              <Plus />
              Add
            </Button>
          </div>
          {attention.length ? (
            <div className="divide-y">
              {attention.map((lead) => {
                const vendor = data.vendors.find(
                  (item) => item.id === lead.assignedVendorId,
                );
                return (
                  <button
                    key={lead.id}
                    onClick={() => onOpenLead(lead.id)}
                    className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-muted/50"
                  >
                    <span
                      className={cx(
                        'size-2 rounded-full',
                        lead.status === 'no_vendor_available'
                          ? 'bg-rose-500'
                          : lead.status === 'sent_to_vendor'
                            ? 'bg-blue-500'
                            : 'bg-amber-500',
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">
                        {lead.firstName} {lead.lastName}{' '}
                        <span className="font-normal text-muted-foreground">
                          · #{lead.displayId}
                        </span>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {vendor?.name || 'ZIP ' + lead.zip}
                      </p>
                    </div>
                    <Badge status={lead.status} />
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          ) : (
            <Empty
              icon={CheckCircle2}
              title="Nothing needs attention"
              body="Your follow-up queue is clear."
            />
          )}
        </section>
        <section className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Vendor capacity</h2>
              <p className="text-sm text-muted-foreground">
                Leads assigned today
              </p>
            </div>
            <CircleGauge className="size-5 text-blue-600" />
          </div>
          <div className="mt-6 space-y-5">
            {data.vendors
              .filter((v) => v.active)
              .map((vendor) => {
                const used = data.leads.filter(
                  (l) =>
                    l.assignedVendorId === vendor.id &&
                    l.createdAt.slice(0, 10) === today(),
                ).length;
                const max = vendor.todayOverride ?? vendor.maxLeadsDay;
                return (
                  <div key={vendor.id}>
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                      <span className="truncate font-medium">
                        {vendor.name}
                      </span>
                      <span
                        className={
                          used >= max
                            ? 'shrink-0 font-semibold text-rose-600'
                            : 'shrink-0 text-muted-foreground'
                        }
                      >
                        {used} / {max} ·{' '}
                        {used >= max ? 'Full' : String(max - used) + ' open'}
                      </span>
                    </div>
                    <Progress
                      value={Math.min(100, (used / Math.max(1, max)) * 100)}
                    />
                  </div>
                );
              })}
          </div>
        </section>
      </div>
      <section className="mt-6 rounded-2xl border bg-slate-950 p-5 text-white shadow-lg shadow-slate-950/10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.12em] text-sky-400">
              Unserved demand
            </p>
            <h2 className="mt-1 text-lg font-semibold">
              {unserved.reduce((sum, item) => sum + item[1], 0)} leads show
              where to recruit next
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {unserved.length ? (
              unserved.slice(0, 4).map(([zip, count]) => (
                <span
                  key={zip}
                  className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
                >
                  <b>{zip}</b> <span className="text-slate-400">· {count}</span>
                </span>
              ))
            ) : (
              <span className="text-sm text-slate-400">
                Every saved ZIP has coverage.
              </span>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

function LeadsView({
  data,
  leads,
  onOpenLead,
}: {
  data: AppState;
  leads: Lead[];
  onOpenLead: (id: string) => void;
}) {
  const [vendorFilter, setVendorFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [campaignFilter, setCampaignFilter] = useState('');
  const [since, setSince] = useState('');
  const shown = leads.filter(
    (lead) =>
      (vendorFilter === 'all' ||
        lead.assignedVendorId === vendorFilter ||
        lead.recommendedVendorId === vendorFilter) &&
      (statusFilter === 'all' || lead.status === statusFilter) &&
      (sourceFilter === 'all' || lead.source === sourceFilter) &&
      (!campaignFilter ||
        lead.campaign.toLowerCase().includes(campaignFilter.toLowerCase())) &&
      (!since || lead.createdAt.slice(0, 10) >= since),
  );
  return (
    <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="border-b px-5 py-4">
        <h2 className="font-semibold">Lead pipeline</h2>
        <p className="text-sm text-muted-foreground">
          {shown.length} leads · click any row to qualify or update
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          <Select
            value={vendorFilter}
            onValueChange={(value) => setVendorFilter(String(value))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Vendor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All vendors</SelectItem>
              {data.vendors.map((vendor) => (
                <SelectItem key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(String(value))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {[...new Set(data.leads.map((lead) => lead.status))].map(
                (status) => (
                  <SelectItem key={status} value={status}>
                    {statusLabels[status] || status}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
          <Select
            value={sourceFilter}
            onValueChange={(value) => setSourceFilter(String(value))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              {[...new Set(data.leads.map((lead) => lead.source))].map(
                (source) => (
                  <SelectItem key={source} value={source}>
                    {source}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
          <Input
            value={campaignFilter}
            onChange={(e) => setCampaignFilter(e.target.value)}
            placeholder="Campaign"
          />
          <Input
            type="date"
            aria-label="Submitted since"
            value={since}
            onChange={(e) => setSince(e.target.value)}
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lead</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Market</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Value</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.map((lead) => {
              const vendor = data.vendors.find(
                (item) => item.id === lead.assignedVendorId,
              );
              return (
                <TableRow
                  key={lead.id}
                  className="cursor-pointer"
                  onClick={() => onOpenLead(lead.id)}
                >
                  <TableCell>
                    <p className="font-medium">
                      {lead.firstName} {lead.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      #{lead.displayId} · {displayDate(lead.createdAt)}
                    </p>
                  </TableCell>
                  <TableCell>
                    <p>{formatPhone(lead.phone)}</p>
                    <p className="text-xs text-muted-foreground">
                      {lead.email || 'No email'}
                    </p>
                  </TableCell>
                  <TableCell>
                    <p>{lead.city || 'Unknown city'}</p>
                    <p className="text-xs text-muted-foreground">{lead.zip}</p>
                  </TableCell>
                  <TableCell>
                    {vendor?.name || (
                      <span className="text-muted-foreground">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge status={lead.status} />
                  </TableCell>
                  <TableCell className="font-medium">
                    {money(lead.expectedMonthlyRevenue)}/mo
                  </TableCell>
                  <TableCell>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      {!shown.length && (
        <Empty
          icon={Search}
          title="No matching leads"
          body="Try a different search or create a new lead."
        />
      )}
    </section>
  );
}

function VendorsView({
  data,
  onOpenVendor,
  onNewVendor,
}: {
  data: AppState;
  onOpenVendor: (id: string) => void;
  onNewVendor: () => void;
}) {
  return (
    <>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Vendor network</h2>
          <p className="text-sm text-muted-foreground">
            Coverage, capacity, economics, and qualification rules
          </p>
        </div>
        <Button onClick={onNewVendor}>
          <Plus />
          Add vendor
        </Button>
      </div>
      <section className="grid gap-4 lg:grid-cols-2">
        {data.vendors.map((vendor) => {
          const used = data.leads.filter(
            (l) =>
              l.assignedVendorId === vendor.id &&
              l.createdAt.slice(0, 10) === today(),
          ).length;
          const max = vendor.todayOverride ?? vendor.maxLeadsDay;
          const sent = data.leads.filter(
            (l) => l.assignedVendorId === vendor.id,
          ).length;
          return (
            <button
              key={vendor.id}
              onClick={() => onOpenVendor(vendor.id)}
              className="rounded-2xl border bg-card p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-start gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700">
                  <Building2 className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-semibold">{vendor.name}</h3>
                    {vendor.preferred && (
                      <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700">
                        Preferred
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {vendor.cities} · {vendor.zips.length} ZIPs
                  </p>
                </div>
                <Pencil className="size-4 text-muted-foreground" />
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3">
                <MiniStat
                  label="Capacity"
                  value={used + '/' + max}
                  tone={used >= max ? 'danger' : ''}
                />
                <MiniStat
                  label="Conversion"
                  value={vendor.conversionRate + '%'}
                />
                <MiniStat
                  label="Your MRR"
                  value={money(vendor.recurringRevenue)}
                />
              </div>
              <Progress
                value={Math.min(100, (used / Math.max(1, max)) * 100)}
                className="mt-4"
              />
              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <span>{vendor.requirements.length} requirements</span>
                <span>{sent} leads sent</span>
              </div>
            </button>
          );
        })}
      </section>
    </>
  );
}

function VendorApplicationsView({
  applications,
  onOpen,
}: {
  applications: VendorApplication[];
  onOpen: (id: string) => void;
}) {
  const pending = applications.filter((item) => item.status === 'pending');
  return (
    <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="border-b px-5 py-4">
        <h2 className="font-semibold">Vendor Applications</h2>
        <p className="text-sm text-muted-foreground">
          Public applicants stay outside the routing network until you approve
          them.
        </p>
      </div>
      <div className="divide-y">
        {applications.map((application) => (
          <button
            key={application.id}
            onClick={() => onOpen(application.id)}
            className="grid w-full gap-2 px-5 py-4 text-left hover:bg-muted/50 sm:grid-cols-[1.2fr_1fr_1fr_auto]"
          >
            <div>
              <p className="font-semibold">{application.companyName}</p>
              <p className="text-sm text-muted-foreground">
                {application.contactName}
              </p>
            </div>
            <div>
              <p className="text-sm">{formatPhone(application.phone)}</p>
              <p className="text-xs text-muted-foreground">
                {application.email}
              </p>
            </div>
            <div>
              <p className="text-sm">
                {application.primaryMarket || 'Market not supplied'}
              </p>
              <p className="text-xs text-muted-foreground">
                Submitted {displayDate(application.submittedAt)}
              </p>
            </div>
            <Badge status={application.status} />
          </button>
        ))}
      </div>
      {!applications.length && (
        <Empty
          icon={Inbox}
          title="No vendor applications"
          body="Share /vendor/apply with prospective partners."
        />
      )}
      {pending.length > 0 && (
        <div className="border-t bg-orange-50 px-5 py-3 text-sm text-orange-900">
          {pending.length} application{pending.length === 1 ? '' : 's'} need
          review.
        </div>
      )}
    </section>
  );
}

function VendorApplicationDialog({
  application,
  open,
  onOpenChange,
  refresh,
  toast,
  onError,
}: {
  application: VendorApplication;
  open: boolean;
  onOpenChange: (value: boolean) => void;
  refresh: () => Promise<void>;
  toast: (value: string) => void;
  onError: (value: string) => void;
}) {
  const [form, setForm] = useState({
    companyName: application.companyName,
    contactName: application.contactName,
    phone: application.phone,
    email: application.email,
    website: application.website,
    primaryMarket: application.primaryMarket,
    zips: Array.isArray(application.data.zips)
      ? application.data.zips.join(', ')
      : String(application.data.zips ?? ''),
    cities: String(application.data.cities ?? ''),
    maxLeadsDay: Number(application.data.maxLeadsDay ?? 5),
    maxLeadsWeek: Number(application.data.maxLeadsWeek ?? 0),
  });
  const [busy, setBusy] = useState(false);
  const act = async (action: string, fields?: Record<string, unknown>) => {
    setBusy(true);
    try {
      await requestJson('/api/vendor-applications', {
        method: 'PATCH',
        body: JSON.stringify({ applicationId: application.id, action, fields }),
      });
      await refresh();
      toast(
        action === 'approve'
          ? 'Vendor approved and created'
          : action === 'reject'
            ? 'Application rejected'
            : 'Application edits saved',
      );
      if (action !== 'update') onOpenChange(false);
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Could not update application');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{application.companyName}</DialogTitle>
          <DialogDescription>
            Review the original application, edit supported fields, then approve
            or reject.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-5 lg:grid-cols-2">
          <section className="grid gap-4 rounded-2xl border p-4">
            <h3 className="font-semibold">Editable vendor profile</h3>
            <Field label="Company">
              <Input
                value={form.companyName}
                onChange={(e) =>
                  setForm({ ...form, companyName: e.target.value })
                }
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Contact">
                <Input
                  value={form.contactName}
                  onChange={(e) =>
                    setForm({ ...form, contactName: e.target.value })
                  }
                />
              </Field>
              <Field label="Phone">
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Email">
              <Input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
            <Field label="Website">
              <Input
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
              />
            </Field>
            <Field label="Primary market">
              <Input
                value={form.primaryMarket}
                onChange={(e) =>
                  setForm({ ...form, primaryMarket: e.target.value })
                }
              />
            </Field>
            <Field label="ZIP codes">
              <Textarea
                value={form.zips}
                onChange={(e) => setForm({ ...form, zips: e.target.value })}
              />
            </Field>
            <Field label="Cities">
              <Input
                value={form.cities}
                onChange={(e) => setForm({ ...form, cities: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Daily lead limit">
                <Input
                  type="number"
                  value={form.maxLeadsDay}
                  onChange={(e) =>
                    setForm({ ...form, maxLeadsDay: Number(e.target.value) })
                  }
                />
              </Field>
              <Field label="Weekly lead limit">
                <Input
                  type="number"
                  value={form.maxLeadsWeek}
                  onChange={(e) =>
                    setForm({ ...form, maxLeadsWeek: Number(e.target.value) })
                  }
                />
              </Field>
            </div>
            <Button
              variant="outline"
              disabled={busy || application.status === 'approved'}
              onClick={() => void act('update', form)}
            >
              Edit Before Approval
            </Button>
          </section>
          <section className="space-y-4">
            <div className="rounded-2xl border p-4">
              <h3 className="font-semibold">Application details</h3>
              <dl className="mt-3 grid gap-3 text-sm">
                {Object.entries(application.data)
                  .filter(
                    ([key]) =>
                      ![
                        'companyName',
                        'contactName',
                        'phone',
                        'email',
                        'website',
                        'requirements',
                        'zips',
                        'cities',
                      ].includes(key),
                  )
                  .map(([key, value]) => (
                    <div key={key}>
                      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {key.replace(/([A-Z])/g, ' $1')}
                      </dt>
                      <dd className="mt-0.5 break-words">
                        {typeof value === 'boolean'
                          ? value
                            ? 'Yes'
                            : 'No'
                          : Array.isArray(value)
                            ? value.join(', ')
                            : String(value ?? '—')}
                      </dd>
                    </div>
                  ))}
              </dl>
            </div>
            <div className="rounded-2xl border p-4">
              <h3 className="font-semibold">Customer requirements</h3>
              <div className="mt-3 space-y-3">
                {application.requirements.map((requirement, index) => (
                  <div key={index} className="rounded-xl bg-muted p-3 text-sm">
                    <p className="font-medium">{requirement.name}</p>
                    <p className="text-muted-foreground">
                      {requirement.question}
                    </p>
                    <p className="mt-1 text-xs">
                      Qualifies:{' '}
                      {requirement.qualifying.map(String).join(', ') ||
                        'Any supplied answer'}
                    </p>
                  </div>
                ))}
                {!application.requirements.length && (
                  <p className="text-sm text-muted-foreground">
                    No custom requirements supplied.
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="destructive"
                disabled={busy || application.status === 'approved'}
                onClick={() => void act('reject')}
              >
                Reject
              </Button>
              <Button
                disabled={busy || application.status === 'approved'}
                onClick={() => void act('approve')}
              >
                {busy ? <LoaderCircle className="animate-spin" /> : <Check />}
                Approve & Create Vendor
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Approval creates the vendor and requirement records. The public
              customer form remains disabled until you enable it in the vendor
              workspace.
            </p>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReportsView({ data }: { data: AppState }) {
  const converted = data.leads.filter((l) =>
    ['converted', 'delivery_scheduled', 'installed'].includes(l.status),
  );
  const totalMrr = converted.reduce(
    (sum, l) => sum + (l.actualMonthlyRevenue ?? l.expectedMonthlyRevenue),
    0,
  );
  const unserved = Object.entries(
    data.leads
      .filter((l) => l.status === 'no_vendor_available')
      .reduce<Record<string, number>>(
        (map, l) => ({ ...map, [l.zip]: (map[l.zip] || 0) + 1 }),
        {},
      ),
  ).sort((a, b) => b[1] - a[1]);
  const byVendor = data.vendors
    .map((v) => {
      const leads = data.leads.filter((l) => l.assignedVendorId === v.id);
      const wins = leads.filter((l) =>
        ['converted', 'delivery_scheduled', 'installed'].includes(l.status),
      );
      return {
        vendor: v,
        leads: leads.length,
        wins: wins.length,
        mrr: wins.reduce((sum, l) => sum + l.expectedMonthlyRevenue, 0),
      };
    })
    .sort((a, b) => b.mrr - a.mrr);
  const publicLeads = data.leads.filter((lead) => lead.publicSubmission);
  const grouped = (label: (lead: Lead) => string) =>
    Object.entries(
      publicLeads.reduce<Record<string, { leads: number; wins: number }>>(
        (map, lead) => {
          const key = label(lead) || 'Unattributed';
          const current = map[key] || { leads: 0, wins: 0 };
          return {
            ...map,
            [key]: {
              leads: current.leads + 1,
              wins:
                current.wins +
                Number(
                  ['converted', 'delivery_scheduled', 'installed'].includes(
                    lead.status,
                  ),
                ),
            },
          };
        },
        {},
      ),
    ).sort((a, b) => b[1].leads - a[1].leads);
  const landing = grouped(
    (lead) =>
      data.vendors.find((vendor) => vendor.id === lead.landingVendorId)?.name ||
      'Generic form',
  );
  const sources = grouped((lead) => lead.utmSource || lead.source);
  const campaigns = grouped((lead) => lead.campaign);
  const utmCampaigns = grouped((lead) => lead.utmCampaign);
  return (
    <>
      <section className="grid gap-3 sm:grid-cols-3">
        <ReportCard
          icon={BadgeDollarSign}
          label="Estimated active MRR"
          value={money(totalMrr)}
          note={converted.length + ' active customers'}
        />
        <ReportCard
          icon={Activity}
          label="Overall conversion"
          value={
            Math.round(
              (converted.length / Math.max(1, data.leads.length)) * 100,
            ) + '%'
          }
          note={converted.length + ' of ' + data.leads.length + ' leads'}
        />
        <ReportCard
          icon={MapPinOff}
          label="Unserved leads"
          value={String(unserved.reduce((sum, item) => sum + item[1], 0))}
          note={unserved.length + ' unique ZIPs'}
        />
      </section>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_.55fr]">
        <section className="rounded-2xl border bg-card p-5 shadow-sm">
          <h2 className="font-semibold">Revenue and conversion by vendor</h2>
          <div className="mt-5 space-y-5">
            {byVendor.map((item) => (
              <div key={item.vendor.id}>
                <div className="mb-2 flex items-end justify-between">
                  <div>
                    <p className="text-sm font-medium">{item.vendor.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.leads} leads · {item.wins} conversions ·{' '}
                      {item.leads
                        ? Math.round((item.wins / item.leads) * 100)
                        : 0}
                      %
                    </p>
                  </div>
                  <p className="font-semibold">{money(item.mrr)} MRR</p>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-blue-600"
                    style={{
                      width:
                        String(
                          Math.max(
                            3,
                            (item.mrr /
                              Math.max(1, ...byVendor.map((v) => v.mrr))) *
                              100,
                          ),
                        ) + '%',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-2xl border bg-card p-5 shadow-sm">
          <h2 className="font-semibold">Unserved ZIPs</h2>
          <p className="text-sm text-muted-foreground">
            Demand to use for vendor recruiting
          </p>
          <div className="mt-5 space-y-3">
            {unserved.length ? (
              unserved.map(([zip, count]) => (
                <div
                  key={zip}
                  className="flex items-center justify-between rounded-xl bg-muted px-4 py-3"
                >
                  <span className="font-semibold">{zip}</span>
                  <span className="text-sm text-muted-foreground">
                    {count} lead{count === 1 ? '' : 's'}
                  </span>
                </div>
              ))
            ) : (
              <Empty
                icon={CheckCircle2}
                title="All covered"
                body="No unserved ZIP demand yet."
              />
            )}
          </div>
        </section>
      </div>
      <section className="mt-6 rounded-2xl border bg-card p-5 shadow-sm">
        <h2 className="font-semibold">Form performance</h2>
        <p className="text-sm text-muted-foreground">
          Lead volume and conversion from public customer forms.
        </p>
        <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {[
            ['Landing vendor', landing],
            ['Source', sources],
            ['Campaign', campaigns],
            ['UTM campaign', utmCampaigns],
          ].map(([title, items]) => (
            <div key={String(title)}>
              <h3 className="text-sm font-semibold">{String(title)}</h3>
              <div className="mt-2 space-y-2">
                {(items as [string, { leads: number; wins: number }][])
                  .slice(0, 8)
                  .map(([name, stats]) => (
                    <div key={name} className="rounded-xl bg-muted p-3 text-sm">
                      <div className="flex justify-between gap-3">
                        <span className="truncate font-medium">{name}</span>
                        <span>{stats.leads}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {stats.wins} converted ·{' '}
                        {Math.round(
                          (stats.wins / Math.max(1, stats.leads)) * 100,
                        )}
                        %
                      </p>
                    </div>
                  ))}
                {!(items as unknown[]).length && (
                  <p className="text-sm text-muted-foreground">
                    No public form data yet.
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="mt-6 rounded-2xl border bg-card p-5 shadow-sm">
        <h2 className="font-semibold">Vendor capacity</h2>
        <div className="mt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendor</TableHead>
                <TableHead>Today used / remaining</TableHead>
                <TableHead>Week used / remaining</TableHead>
                <TableHead>Pending recommendations</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.vendors
                .filter((vendor) => vendor.active)
                .map((vendor) => {
                  const match = routeLead(
                    {
                      ...data.leads[0],
                      zip: vendor.zips[0] || '',
                      answers: {},
                    } as Lead,
                    [vendor],
                    data.leads,
                    data.settings,
                  )[0];
                  const pending = data.leads.filter(
                    (lead) =>
                      lead.recommendedVendorId === vendor.id &&
                      lead.status === 'pending_approval',
                  ).length;
                  return (
                    <TableRow key={vendor.id}>
                      <TableCell className="font-medium">
                        {vendor.name}
                      </TableCell>
                      <TableCell>
                        {match?.usedToday ?? 0} / {match?.remainingToday ?? 0}
                      </TableCell>
                      <TableCell>
                        {match?.usedWeek ?? 0} /{' '}
                        {match?.remainingWeek ?? 'Unlimited'}
                      </TableCell>
                      <TableCell>{pending}</TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </div>
      </section>
    </>
  );
}

function ReportCard({
  icon: Icon,
  label,
  value,
  note,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <article className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <Icon className="size-5 text-blue-600" />
      </div>
      <p className="mt-5 text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{note}</p>
    </article>
  );
}

function SettingsView({
  settings,
  onSaved,
  onError,
}: {
  settings: RoutingSettings;
  onSaved: () => void;
  onError: (value: string) => void;
}) {
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);
  const fields: [keyof RoutingSettings, string, string][] = [
    [
      'capacityWeight',
      'Available capacity',
      'How much open capacity should influence routing',
    ],
    ['priorityWeight', 'Vendor priority', 'Your manual business priority'],
    ['revenueWeight', 'Expected revenue', 'Recurring revenue potential'],
    ['conversionWeight', 'Conversion rate', 'Historical ability to convert'],
    ['reliabilityWeight', 'Reliability', 'Operational consistency'],
    ['preferredWeight', 'Preferred bonus', 'Extra lift for preferred vendors'],
  ];
  const save = async () => {
    setSaving(true);
    try {
      await requestJson('/api/settings', {
        method: 'PATCH',
        body: JSON.stringify(form),
      });
      onSaved();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Could not save settings');
    } finally {
      setSaving(false);
    }
  };
  return (
    <section className="mx-auto max-w-3xl rounded-2xl border bg-card shadow-sm">
      <div className="border-b px-6 py-5">
        <h2 className="font-semibold">Explainable routing weights</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Eligibility rules are mandatory. These weights rank vendors that
          remain compatible.
        </p>
      </div>
      <div className="grid gap-5 p-6">
        {fields.map(([key, label, hint]) => (
          <div
            key={key}
            className="grid gap-3 rounded-xl border p-4 sm:grid-cols-[1fr_110px] sm:items-center"
          >
            <div>
              <p className="font-medium">{label}</p>
              <p className="text-sm text-muted-foreground">{hint}</p>
            </div>
            <Input
              type="number"
              min="0"
              max="100"
              value={form[key]}
              onChange={(e) =>
                setForm({ ...form, [key]: Number(e.target.value) })
              }
            />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between border-t bg-muted/40 px-6 py-4">
        <p className="text-sm text-muted-foreground">
          Total weight: {Object.values(form).reduce((s, v) => s + v, 0)}
        </p>
        <Button onClick={() => void save()} disabled={saving}>
          {saving ? <LoaderCircle className="animate-spin" /> : <Check />}Save
          weights
        </Button>
      </div>
    </section>
  );
}

function NewLeadDialog({
  open,
  onOpenChange,
  leads,
  onCreated,
  onError,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  leads: Lead[];
  onCreated: (id: string) => void;
  onError: (value: string) => void;
}) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    zip: '',
    city: '',
    source: 'Facebook Messenger',
    desiredTimeframe: '',
  });
  const [saving, setSaving] = useState(false);
  const digits = normalize(form.phone);
  const duplicate =
    digits.length >= 10 ? leads.find((l) => l.phone === digits) : null;
  const submit = async () => {
    setSaving(true);
    try {
      const result = await requestJson('/api/leads', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setForm({
        firstName: '',
        lastName: '',
        phone: '',
        zip: '',
        city: '',
        source: 'Facebook Messenger',
        desiredTimeframe: '',
      });
      onCreated(String(result.id));
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Could not create lead');
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>New lead</DialogTitle>
          <DialogDescription>
            Start with what you know. ZIP matching runs immediately after save.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name *">
              <Input
                autoFocus
                value={form.firstName}
                onChange={(e) =>
                  setForm({ ...form, firstName: e.target.value })
                }
                placeholder="Jordan"
              />
            </Field>
            <Field label="Last name">
              <Input
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                placeholder="Davis"
              />
            </Field>
          </div>
          <Field label="Phone *">
            <Input
              inputMode="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="214-555-1234"
            />
          </Field>
          {duplicate && (
            <button
              onClick={() => onCreated(duplicate.id)}
              className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-left text-sm text-amber-900"
            >
              <CircleAlert className="size-5 shrink-0" />
              <span>
                <b>Possible existing lead found:</b> {duplicate.firstName}{' '}
                {duplicate.lastName} · #{duplicate.displayId}. Open this record
                instead.
              </span>
            </button>
          )}
          <div className="grid grid-cols-[1fr_1.4fr] gap-3">
            <Field label="ZIP code *">
              <Input
                inputMode="numeric"
                maxLength={10}
                value={form.zip}
                onChange={(e) => setForm({ ...form, zip: e.target.value })}
                placeholder="75212"
              />
            </Field>
            <Field label="City">
              <Input
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="Dallas"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Lead source">
              <Input
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
              />
            </Field>
            <Field label="Delivery timeframe">
              <Input
                value={form.desiredTimeframe}
                onChange={(e) =>
                  setForm({ ...form, desiredTimeframe: e.target.value })
                }
                placeholder="This week"
              />
            </Field>
          </div>
          <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
            <b>Privacy guard:</b> no banking or card details are collected here.
            Payment setup stays on the selected vendor’s secure page.
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => void submit()}
            disabled={
              saving ||
              !form.firstName ||
              digits.length < 10 ||
              !/^\d{5}(?:-\d{4})?$/.test(form.zip)
            }
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            {saving ? <LoaderCircle className="animate-spin" /> : <Plus />}
            Create & route
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LeadDialog({
  lead,
  data,
  open,
  onOpenChange,
  refresh,
  toast,
  onError,
}: {
  lead: Lead;
  data: AppState;
  open: boolean;
  onOpenChange: (value: boolean) => void;
  refresh: () => Promise<void>;
  toast: (value: string) => void;
  onError: (value: string) => void;
}) {
  const matches = routeLead(lead, data.vendors, data.leads, data.settings);
  const recommended = matches.find((m) => m.eligible);
  const storedRecommended = matches.find(
    (m) => m.vendor.id === lead.recommendedVendorId,
  );
  const manualChoice =
    storedRecommended?.eligible &&
    storedRecommended.vendor.id !== recommended?.vendor.id
      ? storedRecommended
      : null;
  const assigned = matches.find((m) => m.vendor.id === lead.assignedVendorId);
  const selected = assigned || storedRecommended || recommended || matches[0];
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const handoff = lead.handoffs[0];
  const mutate = async (payload: Record<string, unknown>, message?: string) => {
    setBusy(true);
    try {
      await requestJson('/api/leads', {
        method: 'PATCH',
        body: JSON.stringify({ leadId: lead.id, ...payload }),
      });
      await refresh();
      if (message) toast(message);
    } catch (e) {
      await refresh();
      onError(e instanceof Error ? e.message : 'Could not update lead');
    } finally {
      setBusy(false);
    }
  };
  const answer = async (req: Requirement, value: unknown) => {
    await mutate({ action: 'answer', key: req.key, value, label: req.name });
    const fresh = (await requestJson('/api/state')) as unknown as AppState;
    const current = fresh.leads.find((l) => l.id === lead.id);
    if (current?.assignedVendorId) {
      const match = routeLead(
        current,
        fresh.vendors,
        fresh.leads,
        fresh.settings,
      ).find((m) => m.vendor.id === current.assignedVendorId);
      if (
        match &&
        match.requirements
          .filter((r) => r.requirement.required)
          .every((r) => r.state === 'satisfied')
      )
        await requestJson('/api/leads', {
          method: 'PATCH',
          body: JSON.stringify({
            leadId: lead.id,
            action: 'status',
            status: 'qualified',
          }),
        });
    }
    await refresh();
    toast('Qualification answer saved');
  };
  const copy = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    toast(label);
  };
  const followup = selected ? generateFollowup(selected) : '';
  const complete =
    selected?.requirements.filter((r) => r.state === 'satisfied') || [];
  const missing =
    selected?.requirements.filter(
      (r) => r.state === 'missing' && r.requirement.required,
    ) || [];
  const failed =
    selected?.requirements.filter(
      (r) => r.state === 'failed' && r.requirement.required,
    ) || [];
  const applicationAnswers = Object.entries(lead.answers).filter(
    ([key, value]) =>
      customerApplicationLabels[key] &&
      value !== undefined &&
      value !== null &&
      value !== '',
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94vh] overflow-y-auto p-0 sm:max-w-5xl">
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b bg-card px-5 py-4">
          <div className="grid size-10 place-items-center rounded-xl bg-blue-50 font-semibold text-blue-700">
            {lead.firstName[0]}
            {lead.lastName[0]}
          </div>
          <div className="min-w-0 flex-1">
            <DialogTitle>
              {lead.firstName} {lead.lastName}{' '}
              <span className="font-normal text-muted-foreground">
                · #{lead.displayId}
              </span>
            </DialogTitle>
            <DialogDescription>
              {formatPhone(lead.phone)} · ZIP {lead.zip} ·{' '}
              {lead.city || 'City unknown'}
            </DialogDescription>
          </div>
          <Badge status={lead.status} />
        </div>
        <div className="grid gap-5 p-5 lg:grid-cols-[1.12fr_.88fr]">
          <div className="space-y-5">
            <section className="rounded-2xl border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[.1em] text-blue-700">
                    {recommended
                      ? 'Recommended vendor'
                      : 'No compatible vendor'}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold">
                    {recommended?.vendor.name || 'Review blockers below'}
                  </h3>
                </div>
                {recommended && !lead.assignedVendorId && (
                  <Button
                    onClick={() =>
                      void mutate(
                        {
                          action: 'approve',
                          vendorId: recommended.vendor.id,
                        },
                        'Vendor approved and handoff created',
                      )
                    }
                    disabled={busy}
                  >
                    <Check />
                    Approve Vendor
                  </Button>
                )}
              </div>
              {recommended && (
                <>
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <MiniStat
                      label="Score"
                      value={recommended.score + '/100'}
                    />
                    <MiniStat
                      label="Today"
                      value={
                        recommended.usedToday +
                        '/' +
                        (recommended.usedToday + recommended.remainingToday)
                      }
                    />
                    <MiniStat
                      label="This week"
                      value={
                        recommended.remainingWeek == null
                          ? recommended.usedWeek + ' used'
                          : recommended.usedWeek +
                            '/' +
                            (recommended.usedWeek + recommended.remainingWeek)
                      }
                    />
                    <MiniStat
                      label="Pending"
                      value={String(
                        data.leads.filter(
                          (item) =>
                            item.recommendedVendorId ===
                              recommended.vendor.id &&
                            item.status === 'pending_approval',
                        ).length,
                      )}
                    />
                  </div>
                  <div className="mt-4 grid gap-1.5 text-sm">
                    {recommended.reasons.map((reason) => (
                      <p key={reason} className="flex gap-2">
                        <Check className="mt-0.5 size-4 text-emerald-600" />
                        {reason}
                      </p>
                    ))}
                  </div>
                </>
              )}
            </section>
            {manualChoice && !lead.assignedVendorId && (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <h3 className="font-semibold text-amber-950">
                  Manual vendor choice
                </h3>
                <p className="mt-1 text-sm text-amber-900">
                  You chose {manualChoice.vendor.name}, while RelayRoute
                  currently ranks {recommended?.vendor.name} first. Current
                  blockers:{' '}
                  {manualChoice.blockers.length
                    ? manualChoice.blockers.join(' · ')
                    : 'none'}
                  .
                </p>
                <Button
                  className="mt-3"
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    void mutate(
                      {
                        action: 'approve',
                        vendorId: manualChoice.vendor.id,
                        manualOverride: true,
                      },
                      'Manual vendor override approved and handoff created',
                    )
                  }
                >
                  <Check />
                  Approve override
                </Button>
              </section>
            )}
            <section className="rounded-2xl border">
              <div className="border-b px-4 py-3">
                <h3 className="font-semibold">Alternatives & blockers</h3>
                <p className="text-sm text-muted-foreground">
                  Alternatives update the recommendation; approval stays
                  separate.
                </p>
              </div>
              <div className="divide-y">
                {matches.map((match, index) => (
                  <button
                    key={match.vendor.id}
                    onClick={() =>
                      match.eligible &&
                      void mutate(
                        {
                          action: 'recommend',
                          vendorId: match.vendor.id,
                          score: match.score,
                        },
                        'Recommendation updated',
                      )
                    }
                    disabled={!match.eligible}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <span className="grid size-7 place-items-center rounded-full bg-muted text-xs font-semibold">
                      {match.eligible ? (
                        index + 1
                      ) : (
                        <XCircle className="size-4 text-rose-600" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">
                        {match.vendor.name}
                        {lead.assignedVendorId === match.vendor.id && (
                          <span className="ml-2 text-xs text-blue-700">
                            Approved
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {match.eligible
                          ? `${match.remainingToday} slots open · score ${match.score}`
                          : match.blockers.join(' · ')}
                      </p>
                    </div>
                    {match.eligible && <b className="text-sm">{match.score}</b>}
                  </button>
                ))}
              </div>
              {!matches.some((m) => m.eligible) && (
                <Empty
                  icon={MapPinOff}
                  title="No active vendor can take this lead"
                  body="Keep the lead saved for unserved-demand reporting."
                />
              )}
            </section>
            {selected && (
              <section className="rounded-2xl border">
                <div className="border-b px-4 py-3">
                  <h3 className="font-semibold">
                    Qualification checklist · {selected.vendor.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {complete.length} complete · {missing.length} missing ·{' '}
                    {failed.length} failed
                  </p>
                </div>
                <div className="divide-y">
                  {selected.requirements.map((item) => (
                    <RequirementRow
                      key={item.requirement.id}
                      item={item}
                      onAnswer={(value) => void answer(item.requirement, value)}
                      disabled={busy}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
          <aside className="space-y-5">
            {lead.publicSubmission && (
              <section className="rounded-2xl border bg-card p-4">
                <h3 className="font-semibold">Customer application</h3>
                <dl className="mt-3 grid gap-2 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Delivery address</dt>
                    <dd className="font-medium">
                      {lead.address || 'Not provided'}
                      {lead.answers.unit_number
                        ? `, Unit ${String(lead.answers.unit_number)}`
                        : ''}
                      {lead.city ? `, ${lead.city}` : ''}, {lead.zip}
                    </dd>
                  </div>
                  {applicationAnswers.map(([key, value]) => (
                    <div key={key}>
                      <dt className="text-muted-foreground">
                        {customerApplicationLabels[key]}
                      </dt>
                      <dd className="font-medium">
                        {Array.isArray(value)
                          ? value.join(', ')
                          : typeof value === 'boolean'
                            ? value
                              ? 'Yes'
                              : 'No'
                            : String(value)}
                      </dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-4 border-t pt-4">
                  <p className="text-xs font-semibold uppercase tracking-[.1em] text-muted-foreground">
                    Supporting documents
                  </p>
                  <div className="mt-2 grid gap-2">
                    {lead.documents.length ? (
                      lead.documents.map((document) => (
                        <a
                          key={document.id}
                          href={`/api/lead-documents/${document.id}`}
                          className="flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition hover:border-blue-300 hover:bg-blue-50"
                        >
                          <FileText className="size-5 shrink-0 text-blue-700" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">
                              {document.kind === 'paystub'
                                ? 'Recent paystub'
                                : "Driver's license (front)"}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {document.originalName} ·{' '}
                              {(document.size / 1024 / 1024).toFixed(1)} MB
                            </span>
                          </span>
                          <Download className="size-4 shrink-0" />
                        </a>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No documents attached.
                      </p>
                    )}
                  </div>
                </div>
              </section>
            )}
            {lead.publicSubmission && (
              <section className="rounded-2xl border bg-card p-4">
                <h3 className="font-semibold">Form attribution</h3>
                <dl className="mt-3 grid gap-2 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Intended vendor</dt>
                    <dd className="font-medium">
                      {data.vendors.find(
                        (vendor) => vendor.id === lead.landingVendorId,
                      )?.name || 'Generic form'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Landing page</dt>
                    <dd className="break-all font-medium">
                      {lead.landingPage}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Source / campaign</dt>
                    <dd className="font-medium">
                      {lead.utmSource || lead.source}
                      {lead.utmCampaign ? ` · ${lead.utmCampaign}` : ''}
                    </dd>
                  </div>
                  {lead.utmMedium && (
                    <div>
                      <dt className="text-muted-foreground">Medium</dt>
                      <dd>{lead.utmMedium}</dd>
                    </div>
                  )}
                  {lead.utmContent && (
                    <div>
                      <dt className="text-muted-foreground">Content</dt>
                      <dd>{lead.utmContent}</dd>
                    </div>
                  )}
                  {lead.utmTerm && (
                    <div>
                      <dt className="text-muted-foreground">Term</dt>
                      <dd>{lead.utmTerm}</dd>
                    </div>
                  )}
                  {lead.fbclid && (
                    <div>
                      <dt className="text-muted-foreground">
                        Facebook click ID
                      </dt>
                      <dd className="break-all text-xs">{lead.fbclid}</dd>
                    </div>
                  )}
                  {lead.possibleDuplicateOf && (
                    <div className="rounded-lg bg-amber-50 p-2 text-amber-900">
                      Possible duplicate of another active/recent lead.
                    </div>
                  )}
                </dl>
              </section>
            )}
            {selected && failed.length > 0 && (
              <section className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                <h3 className="flex items-center gap-2 font-semibold text-rose-800">
                  <XCircle className="size-5" />
                  Failed requirements
                </h3>
                {failed.map((item) => (
                  <p
                    key={item.requirement.id}
                    className="mt-2 text-sm text-rose-800"
                  >
                    <b>{item.requirement.name}:</b> {String(item.answer)}.{' '}
                    {selected.vendor.name} requires{' '}
                    {item.requirement.qualifying.join(' or ')}.
                  </p>
                ))}
                {recommended &&
                  recommended.vendor.id !== selected.vendor.id && (
                    <Button
                      size="sm"
                      className="mt-3"
                      onClick={() =>
                        void mutate(
                          {
                            action: 'recommend',
                            vendorId: recommended.vendor.id,
                            score: recommended.score,
                          },
                          'Recommendation switched to compatible vendor',
                        )
                      }
                    >
                      Switch to {recommended.vendor.name}
                    </Button>
                  )}
              </section>
            )}
            {selected && missing.length > 0 && (
              <section className="rounded-2xl border bg-card p-4">
                <h3 className="flex items-center gap-2 font-semibold">
                  <MessageCircle className="size-5 text-amber-600" />
                  Ask only what’s missing
                </h3>
                <Textarea
                  readOnly
                  value={followup}
                  className="mt-3 min-h-28 bg-muted/40"
                />
                <Button
                  variant="outline"
                  className="mt-3 w-full"
                  onClick={() =>
                    void copy(followup, 'Qualification message copied')
                  }
                >
                  <Clipboard />
                  Copy message
                </Button>
              </section>
            )}
            {handoff && (
              <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <h3 className="flex items-center gap-2 font-semibold text-emerald-800">
                  <Send className="size-5" />
                  Vendor handoff · {handoff.status}
                </h3>
                <p className="mt-1 text-sm text-emerald-800">
                  This approved message is a permanent historical snapshot.
                </p>
                <Textarea
                  readOnly
                  value={handoff.messageSnapshot}
                  className="mt-3 min-h-64 bg-white font-mono text-xs"
                />
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    onClick={() =>
                      void copy(
                        handoff.messageSnapshot,
                        'Handoff message copied',
                      )
                    }
                  >
                    <Clipboard />
                    Copy Message
                  </Button>
                  <Button
                    disabled={handoff.status === 'sent' || busy}
                    onClick={() =>
                      void mutate(
                        { action: 'handoff_sent', handoffId: handoff.id },
                        'Marked sent to vendor',
                      )
                    }
                  >
                    <Send />
                    Mark as Sent
                  </Button>
                </div>
              </section>
            )}
            <section className="rounded-2xl border bg-card p-4">
              <h3 className="font-semibold">Conversion tracking</h3>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {[
                  ['signup_started', 'Signup started'],
                  ['signup_completed', 'Signup complete'],
                  ['converted', 'Converted'],
                  ['installed', 'Installed'],
                ].map(([status, label]) => (
                  <Button
                    key={status}
                    variant={lead.status === status ? 'default' : 'outline'}
                    size="sm"
                    onClick={() =>
                      void mutate(
                        { action: 'status', status },
                        'Marked ' + label.toLowerCase(),
                      )
                    }
                  >
                    {label}
                  </Button>
                ))}
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() =>
                    void mutate(
                      { action: 'status', status: 'lost' },
                      'Lead marked lost',
                    )
                  }
                >
                  Mark lost
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    void mutate(
                      { action: 'status', status: 'qualified' },
                      'Lead marked qualified',
                    )
                  }
                >
                  Manual qualify
                </Button>
              </div>
            </section>
            <section className="rounded-2xl border bg-card p-4">
              <h3 className="font-semibold">Activity</h3>
              <div className="mt-3 space-y-4">
                {lead.activities.slice(0, 8).map((activity) => (
                  <div
                    key={activity.id}
                    className="relative pl-5 text-sm before:absolute before:left-1 before:top-2 before:size-2 before:rounded-full before:bg-blue-500"
                  >
                    <p>{activity.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {displayDate(activity.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add a note…"
                />
                <Button
                  size="icon"
                  onClick={() => {
                    void mutate({ action: 'note', note }, 'Note added');
                    setNote('');
                  }}
                  disabled={!note.trim()}
                >
                  <Plus />
                </Button>
              </div>
            </section>
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RequirementRow({
  item,
  onAnswer,
  disabled,
}: {
  item: VendorMatch['requirements'][number];
  onAnswer: (value: unknown) => void;
  disabled: boolean;
}) {
  const req = item.requirement;
  const icon =
    item.state === 'satisfied' ? (
      <CheckCircle2 className="size-5 text-emerald-600" />
    ) : item.state === 'failed' ? (
      <XCircle className="size-5 text-rose-600" />
    ) : (
      <CircleAlert className="size-5 text-amber-600" />
    );
  const control =
    req.type === 'boolean' ? (
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={
            item.answer === true || item.answer === 'Yes'
              ? 'default'
              : 'outline'
          }
          onClick={() => onAnswer(true)}
          disabled={disabled}
        >
          Yes
        </Button>
        <Button
          size="sm"
          variant={
            item.answer === false || item.answer === 'No'
              ? 'destructive'
              : 'outline'
          }
          onClick={() => onAnswer(false)}
          disabled={disabled}
        >
          No
        </Button>
      </div>
    ) : req.type === 'single_select' ? (
      <Select
        value={typeof item.answer === 'string' ? item.answer : ''}
        onValueChange={onAnswer}
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Choose answer" />
        </SelectTrigger>
        <SelectContent>
          {req.options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    ) : (
      <Input
        defaultValue={typeof item.answer === 'string' ? item.answer : ''}
        onBlur={(e) => e.target.value && onAnswer(e.target.value)}
        placeholder="Enter answer"
        className="max-w-60"
      />
    );
  return (
    <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 gap-3">
        {icon}
        <div>
          <p className="font-medium">{req.name}</p>
          <p className="text-sm text-muted-foreground">{req.question}</p>
        </div>
      </div>
      {control}
    </div>
  );
}

function VendorDialog({
  vendor,
  open,
  onOpenChange,
  refresh,
  toast,
  onError,
}: {
  vendor: Vendor;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  refresh: () => Promise<void>;
  toast: (v: string) => void;
  onError: (v: string) => void;
}) {
  const [form, setForm] = useState({ ...vendor, zips: vendor.zips.join(', ') });
  const [capacity, setCapacity] = useState(
    String(vendor.todayOverride ?? vendor.maxLeadsDay),
  );
  const [req, setReq] = useState({
    name: '',
    question: '',
    type: 'boolean',
    options: 'Yes, No',
    qualifying: 'Yes',
    disqualifying: 'No',
  });
  const [busy, setBusy] = useState(false);
  const act = async (payload: Record<string, unknown>, message: string) => {
    setBusy(true);
    try {
      await requestJson('/api/vendors', {
        method: 'PATCH',
        body: JSON.stringify({ vendorId: vendor.id, ...payload }),
      });
      await refresh();
      toast(message);
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Could not update vendor');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{vendor.name}</DialogTitle>
          <DialogDescription>
            Edit coverage, economics, capacity, and configurable requirements.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-5 lg:grid-cols-2">
          <section className="grid gap-4 rounded-2xl border p-4">
            <h3 className="font-semibold">Vendor profile</h3>
            <Field label="Vendor name">
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Contact">
                <Input
                  value={form.contactName}
                  onChange={(e) =>
                    setForm({ ...form, contactName: e.target.value })
                  }
                />
              </Field>
              <Field label="Phone">
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Cities served">
              <Input
                value={form.cities}
                onChange={(e) => setForm({ ...form, cities: e.target.value })}
              />
            </Field>
            <Field
              label="ZIP codes"
              hint="Comma or space separated exact V1 ZIPs"
            >
              <Textarea
                value={form.zips}
                onChange={(e) => setForm({ ...form, zips: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Price">
                <Input
                  type="number"
                  value={form.customerMonthlyPrice}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      customerMonthlyPrice: Number(e.target.value),
                    })
                  }
                />
              </Field>
              <Field label="Your MRR">
                <Input
                  type="number"
                  value={form.recurringRevenue}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      recurringRevenue: Number(e.target.value),
                    })
                  }
                />
              </Field>
              <Field label="Priority">
                <Input
                  type="number"
                  value={form.priority}
                  onChange={(e) =>
                    setForm({ ...form, priority: Number(e.target.value) })
                  }
                />
              </Field>
            </div>
            <Field label="Signup URL">
              <Input
                type="url"
                value={form.signupUrl}
                onChange={(e) =>
                  setForm({ ...form, signupUrl: e.target.value })
                }
              />
            </Field>
            <Field
              label="Public form slug"
              hint="Lowercase letters, numbers, and hyphens"
            >
              <Input
                value={form.publicSlug}
                onChange={(e) =>
                  setForm({ ...form, publicSlug: e.target.value })
                }
                placeholder="clark"
              />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={form.active ? 'default' : 'outline'}
                onClick={() => setForm({ ...form, active: !form.active })}
              >
                {form.active ? 'Active' : 'Inactive'}
              </Button>
              <Button
                variant={form.preferred ? 'default' : 'outline'}
                onClick={() => setForm({ ...form, preferred: !form.preferred })}
              >
                {form.preferred ? 'Preferred' : 'Standard priority'}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={form.publicFormEnabled ? 'default' : 'outline'}
                onClick={() =>
                  setForm({
                    ...form,
                    publicFormEnabled: !form.publicFormEnabled,
                  })
                }
              >
                {form.publicFormEnabled
                  ? 'Public form enabled'
                  : 'Public form disabled'}
              </Button>
              <Button
                variant={form.showVendorBranding ? 'default' : 'outline'}
                onClick={() =>
                  setForm({
                    ...form,
                    showVendorBranding: !form.showVendorBranding,
                  })
                }
              >
                {form.showVendorBranding ? 'Branding shown' : 'Branding hidden'}
              </Button>
            </div>
            <Button
              onClick={() =>
                void act(
                  { action: 'update', fields: form },
                  'Vendor profile saved',
                )
              }
              disabled={busy}
            >
              <Check />
              Save profile
            </Button>
          </section>
          <div className="space-y-5">
            <section className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
              <h3 className="font-semibold text-blue-950">Public form URL</h3>
              <p className="mt-1 break-all text-sm text-blue-900">
                {form.publicSlug
                  ? `/rent/${form.publicSlug}`
                  : 'Add a public slug to create this link.'}
              </p>
              <Button
                variant="outline"
                className="mt-3 bg-white"
                disabled={!form.publicSlug}
                onClick={() => {
                  void navigator.clipboard.writeText(
                    `${window.location.origin}/rent/${form.publicSlug}`,
                  );
                  toast('Public form link copied');
                }}
              >
                <Clipboard />
                Copy Link
              </Button>
              <p className="mt-2 text-xs text-blue-800">
                Target attribution is recorded internally; vendor branding stays
                hidden unless enabled.
              </p>
            </section>
            <section className="rounded-2xl border p-4">
              <h3 className="font-semibold">Today’s capacity override</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Normal limit: {vendor.maxLeadsDay}. This exception applies only
                today.
              </p>
              <div className="mt-3 flex gap-2">
                <Input
                  type="number"
                  min="0"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                />
                <Button
                  onClick={() =>
                    void act(
                      { action: 'capacity', maxLeads: Number(capacity) },
                      'Today’s capacity updated',
                    )
                  }
                >
                  Set override
                </Button>
              </div>
            </section>
            <section className="rounded-2xl border">
              <div className="border-b px-4 py-3">
                <h3 className="font-semibold">Custom requirements</h3>
                <p className="text-sm text-muted-foreground">
                  {vendor.requirements.length} structured qualification rules
                </p>
              </div>
              <div className="divide-y">
                {vendor.requirements.map((r) => (
                  <div key={r.id} className="px-4 py-3">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{r.name}</p>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                        {r.type.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {r.question}
                    </p>
                    <p className="mt-1 text-xs text-emerald-700">
                      Qualifies:{' '}
                      {r.qualifying.map(String).join(', ') ||
                        'Any provided answer'}
                    </p>
                  </div>
                ))}
              </div>
              <div className="grid gap-3 border-t bg-muted/30 p-4">
                <p className="font-medium">Add requirement</p>
                <Input
                  placeholder="Requirement name"
                  value={req.name}
                  onChange={(e) => setReq({ ...req, name: e.target.value })}
                />
                <Input
                  placeholder="Customer-facing question"
                  value={req.question}
                  onChange={(e) => setReq({ ...req, question: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Select
                    value={req.type}
                    onValueChange={(value) =>
                      setReq({ ...req, type: String(value) })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        'boolean',
                        'text',
                        'number',
                        'single_select',
                        'multi_select',
                        'date',
                      ].map((type) => (
                        <SelectItem key={type} value={type}>
                          {type.replace('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Options"
                    value={req.options}
                    onChange={(e) =>
                      setReq({ ...req, options: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Qualifying answers"
                    value={req.qualifying}
                    onChange={(e) =>
                      setReq({ ...req, qualifying: e.target.value })
                    }
                  />
                  <Input
                    placeholder="Disqualifying answers"
                    value={req.disqualifying}
                    onChange={(e) =>
                      setReq({ ...req, disqualifying: e.target.value })
                    }
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() =>
                    void act(
                      {
                        action: 'requirement',
                        name: req.name,
                        question: req.question,
                        type: req.type,
                        options: req.options
                          .split(',')
                          .map((v) => v.trim())
                          .filter(Boolean),
                        qualifying: req.qualifying
                          .split(',')
                          .map((v) => v.trim())
                          .filter(Boolean),
                        disqualifying: req.disqualifying
                          .split(',')
                          .map((v) => v.trim())
                          .filter(Boolean),
                        customerLabel: req.name,
                      },
                      'Requirement added',
                    )
                  }
                  disabled={!req.name || !req.question}
                >
                  <Plus />
                  Add requirement
                </Button>
              </div>
            </section>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NewVendorDialog({
  open,
  onOpenChange,
  onCreated,
  onError,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
  onError: (v: string) => void;
}) {
  const [form, setForm] = useState({
    name: '',
    contactName: '',
    phone: '',
    email: '',
    cities: '',
    zips: '',
    maxLeadsDay: 5,
    customerMonthlyPrice: 85,
    fulfillmentCost: 70,
    recurringRevenue: 15,
    signupUrl: '',
    supportsGas: false,
  });
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      await requestJson('/api/vendors', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      onCreated();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Could not add vendor');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Add vendor</DialogTitle>
          <DialogDescription>
            Create the profile now; add custom qualification rules from the
            vendor workspace.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <Field label="Vendor name *">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Contact">
              <Input
                value={form.contactName}
                onChange={(e) =>
                  setForm({ ...form, contactName: e.target.value })
                }
              />
            </Field>
            <Field label="Phone">
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Cities served">
            <Input
              value={form.cities}
              onChange={(e) => setForm({ ...form, cities: e.target.value })}
            />
          </Field>
          <Field label="ZIP codes">
            <Textarea
              value={form.zips}
              onChange={(e) => setForm({ ...form, zips: e.target.value })}
              placeholder="75201, 75202, 75203"
            />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Daily capacity">
              <Input
                type="number"
                value={form.maxLeadsDay}
                onChange={(e) =>
                  setForm({ ...form, maxLeadsDay: Number(e.target.value) })
                }
              />
            </Field>
            <Field label="Customer price">
              <Input
                type="number"
                value={form.customerMonthlyPrice}
                onChange={(e) =>
                  setForm({
                    ...form,
                    customerMonthlyPrice: Number(e.target.value),
                  })
                }
              />
            </Field>
            <Field label="Your MRR">
              <Input
                type="number"
                value={form.recurringRevenue}
                onChange={(e) =>
                  setForm({ ...form, recurringRevenue: Number(e.target.value) })
                }
              />
            </Field>
          </div>
          <Field label="Secure vendor signup URL">
            <Input
              type="url"
              value={form.signupUrl}
              onChange={(e) => setForm({ ...form, signupUrl: e.target.value })}
            />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={!form.name || busy}>
            {busy ? <LoaderCircle className="animate-spin" /> : <Plus />}Create
            vendor
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
