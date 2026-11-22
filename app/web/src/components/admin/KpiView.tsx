import type { AdminViewServerProps } from 'payload';
import { KpiDashboard } from './KpiDashboard.tsx';
import { PAGE, pick } from '@/admin-ui/copy.ts';
import { NoAccess, StaffShell, staffOf, viewLang } from './shell.tsx';

export function KpiView(props: AdminViewServerProps) {
  const staff = staffOf(props);
  const lang = viewLang(props);
  const shell = { ...props, title: pick(PAGE.reports.name, lang), subtitle: pick(PAGE.reports.line, lang) };
  if (!staff || !staff.can('kpi.read')) return <StaffShell {...shell}>{<NoAccess need="kpi.read" lang={lang} />}</StaffShell>;
  return (
    <StaffShell {...shell}>
      <KpiDashboard canReconcile={staff.can('system.reconcile')} />
    </StaffShell>
  );
}
