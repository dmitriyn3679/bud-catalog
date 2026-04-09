import bcrypt from 'bcryptjs';
import { User } from '../models/User';

export async function ensureRetailUser(): Promise<void> {
  const exists = await User.findOne({ isSystemRetail: true });
  if (exists) return;

  try {
    const passwordHash = await bcrypt.hash('SYSTEM_RETAIL_NO_LOGIN_' + Date.now(), 10);
    await User.create({
      name: 'Роздрібний клієнт',
      email: 'retail@system.internal',
      passwordHash,
      shopName: '—',
      city: '—',
      address: '—',
      role: 'user',
      isSystemRetail: true,
    });
    console.log('[system] Retail user created');
  } catch (e: unknown) {
    if ((e as { code?: number }).code !== 11000) throw e;
  }
}
