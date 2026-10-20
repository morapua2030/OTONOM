import type { AdminViewServerProps } from 'payload';
import { KpiDashboard } from './KpiDashboard.tsx';
import { NoAccess, StaffShell, staffOf } from './shell.tsx';

export function KpiView(props: AdminViewServerProps) {
  const staff = staffOf(props);
  const shell = { ...props, title: 'KPI dashboard', subtitle: 'Signed contract value by exclusive attribution class and independent customer cohort. Pipeline is shown separately and never added to signed value.' };
  if (!staff || !staff.can('kpi.read')) return <StaffShell {...shell}>{<NoAccess need="kpi.read" />}</StaffShell>;
  return (
    <StaffShell {...shell}>
      <KpiDashboard canReconcile={staff.can('system.reconcile')} />
    </StaffShell>
  );
}
