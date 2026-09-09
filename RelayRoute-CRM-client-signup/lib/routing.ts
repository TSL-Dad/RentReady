import type { Lead, RoutingSettings, Vendor, VendorMatch } from './types';

const todayKey = () => new Date().toISOString().slice(0, 10);

export function evaluateRequirement(
  requirement: Vendor['requirements'][number],
  answer: unknown,
) {
  if (
    answer === undefined ||
    answer === null ||
    answer === '' ||
    answer === 'unknown'
  )
    return 'missing' as const;
  const comparable =
    typeof answer === 'boolean' ? answer : String(answer).toLowerCase();
  const disqualifying = requirement.disqualifying.map((value) =>
    typeof value === 'boolean' ? value : String(value).toLowerCase(),
  );
  const qualifying = requirement.qualifying.map((value) =>
    typeof value === 'boolean' ? value : String(value).toLowerCase(),
  );
  if (disqualifying.includes(comparable as never)) return 'failed' as const;
  if (qualifying.length && !qualifying.includes(comparable as never))
    return 'failed' as const;
  return 'satisfied' as const;
}

export function routeLead(
  lead: Lead,
  vendors: Vendor[],
  leads: Lead[],
  settings: RoutingSettings,
): VendorMatch[] {
  const today = todayKey();
  const maxRevenue = Math.max(
    1,
    ...vendors.map((vendor) => vendor.recurringRevenue),
  );
  return vendors
    .map((vendor) => {
      const usedToday = leads.filter(
        (item) =>
          item.assignedVendorId === vendor.id &&
          item.createdAt.slice(0, 10) === today,
      ).length;
      const dailyLimit = vendor.todayOverride ?? vendor.maxLeadsDay;
      const remainingToday = Math.max(0, dailyLimit - usedToday);
      const weeklyStart = new Date();
      weeklyStart.setUTCDate(weeklyStart.getUTCDate() - 6);
      const usedWeek = leads.filter(
        (item) =>
          item.assignedVendorId === vendor.id &&
          new Date(item.createdAt) >= weeklyStart,
      ).length;
      const remainingWeek =
        vendor.maxLeadsWeek == null
          ? null
          : Math.max(0, vendor.maxLeadsWeek - usedWeek);
      const requirements = vendor.requirements.map((requirement) => ({
        requirement,
        state: evaluateRequirement(requirement, lead.answers[requirement.key]),
        answer: lead.answers[requirement.key],
      }));
      const blockers: string[] = [];
      const zipMatch = vendor.zips.includes(lead.zip.slice(0, 5));
      if (!vendor.active) blockers.push('Vendor is inactive');
      if (!zipMatch) blockers.push(`Does not serve ZIP ${lead.zip}`);
      if (remainingToday <= 0) blockers.push('Daily capacity is full');
      if (vendor.maxLeadsWeek && usedWeek >= vendor.maxLeadsWeek)
        blockers.push('Weekly capacity is full');
      requirements
        .filter((item) => item.state === 'failed' && item.requirement.required)
        .forEach((item) =>
          blockers.push(`${item.requirement.name} is incompatible`),
        );
      const eligible = blockers.length === 0;
      const capacity = dailyLimit ? remainingToday / dailyLimit : 0;
      const base =
        capacity * settings.capacityWeight +
        (vendor.priority / 100) * settings.priorityWeight +
        (vendor.recurringRevenue / maxRevenue) * settings.revenueWeight +
        (vendor.conversionRate / 100) * settings.conversionWeight +
        (vendor.reliability / 100) * settings.reliabilityWeight +
        (vendor.preferred ? settings.preferredWeight : 0);
      const totalWeight = Object.values(settings).reduce(
        (sum, value) => sum + value,
        0,
      );
      const score = eligible ? Math.round((base / totalWeight) * 100) : 0;
      const reasons = zipMatch
        ? [
            `Serves ZIP ${lead.zip.slice(0, 5)}`,
            `${remainingToday} of ${dailyLimit} slots open today`,
            ...(remainingWeek == null
              ? []
              : [
                  `${remainingWeek} of ${vendor.maxLeadsWeek} slots open this week`,
                ]),
            ...(requirements.some(
              (item) => item.state === 'missing' && item.requirement.required,
            )
              ? [
                  `${requirements.filter((item) => item.state === 'missing' && item.requirement.required).length} required answer${requirements.filter((item) => item.state === 'missing' && item.requirement.required).length === 1 ? '' : 's'} still missing`,
                ]
              : ['Requirements satisfied']),
            ...(vendor.preferred ? ['Preferred vendor'] : []),
            `${vendor.conversionRate}% historical conversion`,
            `$${vendor.recurringRevenue.toFixed(0)} expected monthly revenue`,
          ]
        : [];
      return {
        vendor,
        eligible,
        score,
        usedToday,
        remainingToday,
        usedWeek,
        remainingWeek,
        reasons,
        blockers,
        requirements,
      };
    })
    .sort(
      (a, b) => Number(b.eligible) - Number(a.eligible) || b.score - a.score,
    );
}

export function generateFollowup(match: VendorMatch) {
  const questions = match.requirements
    .filter((item) => item.state === 'missing' && item.requirement.required)
    .map((item) => item.requirement.question.replace(/[?]+$/, ''));
  if (!questions.length) return '';
  const body =
    questions.length === 1
      ? questions[0]
      : `${questions.slice(0, -1).join(', ')}, and ${questions.at(-1)}`;
  return `Great, I just need to confirm ${questions.length === 1 ? 'one thing' : 'a couple things'} before I check delivery availability. ${body}?`;
}

export function generateVendorHandoff(lead: Lead, vendor: Vendor) {
  const answerLines = vendor.requirements
    .filter(
      (requirement) =>
        lead.answers[requirement.key] !== undefined &&
        lead.answers[requirement.key] !== '',
    )
    .map((requirement) => {
      const value = lead.answers[requirement.key];
      return `${requirement.customerLabel || requirement.name}: ${Array.isArray(value) ? value.join(', ') : typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}`;
    });
  return [
    'New washer/dryer rental lead',
    '',
    `Name: ${[lead.firstName, lead.lastName].filter(Boolean).join(' ')}`,
    `Phone: ${lead.phone}`,
    ...(lead.email ? [`Email: ${lead.email}`] : []),
    `ZIP: ${lead.zip}`,
    ...(lead.city ? [`City: ${lead.city}`] : []),
    ...(lead.desiredTimeframe ? [`Timing: ${lead.desiredTimeframe}`] : []),
    ...(lead.availability ? [`Availability: ${lead.availability}`] : []),
    ...(lead.address ? [`Delivery address: ${lead.address}`] : []),
    ...(answerLines.length ? ['', 'Customer details:', ...answerLines] : []),
  ].join('\n');
}

export function currentRecommendation(
  lead: Lead,
  vendors: Vendor[],
  leads: Lead[],
  settings: RoutingSettings,
) {
  return (
    routeLead(lead, vendors, leads, settings).find((match) => match.eligible) ??
    null
  );
}

export function approvalPlan(
  lead: Lead,
  requestedVendorId: string,
  vendors: Vendor[],
  leads: Lead[],
  settings: RoutingSettings,
) {
  const matches = routeLead(lead, vendors, leads, settings);
  const current = matches.find((match) => match.eligible) ?? null;
  const requested =
    matches.find((match) => match.vendor.id === requestedVendorId) ?? null;
  return {
    current,
    requested,
    canApprove: Boolean(
      current && requested?.eligible && current.vendor.id === requestedVendorId,
    ),
    changed: Boolean(current && current.vendor.id !== requestedVendorId),
  };
}
