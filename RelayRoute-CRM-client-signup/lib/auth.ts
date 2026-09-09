import { getChatGPTUser } from '@/app/chatgpt-auth';

export async function apiUser() {
  const user = await getChatGPTUser();
  if (user) return user;
  if (process.env.NODE_ENV === 'development') return { userId: 'local-demo', displayName: 'Local demo user', email: 'demo@local.test', fullName: 'Local demo user' };
  return null;
}
