import DashboardApp from '@/app/dashboard';
import { getChatGPTUser, requireChatGPTUser } from '@/app/chatgpt-auth';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const user = process.env.NODE_ENV === 'development'
    ? (await getChatGPTUser()) ?? { displayName: 'Local demo user' }
    : await requireChatGPTUser('/');
  return <DashboardApp displayName={user.displayName} />;
}
