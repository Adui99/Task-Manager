import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { env } from '@/env';

export async function verifyAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  if (!token) return null;

  try {
    const secretKey = new TextEncoder().encode(env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secretKey);
    return payload as { userId: string; role: string; email: string };
  } catch (error) {
    return null;
  }
}
