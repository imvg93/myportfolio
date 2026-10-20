import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAuthSession, getSessionToken } from '@/lib/auth-session';
import { isMonitoringAdmin } from '@/lib/monitoring';
import MonitoringDashboard from './MonitoringDashboard';

export const dynamic = 'force-dynamic';

export default async function MonitoringPage() {
  const incoming = await headers();
  const request = new Request('http://localhost/admin/gireesh-activity', {
    headers: { cookie: incoming.get('cookie') ?? '' },
  });
  let session = null;
  try {
    session = await getAuthSession(getSessionToken(request));
  } catch {
    redirect('/verify');
  }
  if (!session || !isMonitoringAdmin(session)) redirect('/');
  return <MonitoringDashboard />;
}
