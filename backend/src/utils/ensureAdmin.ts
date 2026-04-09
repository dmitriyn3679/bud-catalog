import bcrypt from 'bcryptjs';
import { User } from '../models/User';

export async function ensureAdmin(): Promise<void> {
  const email = process.env.INIT_ADMIN_EMAIL;
  const password = process.env.INIT_ADMIN_PASSWORD;
  if (!email || !password) return;

  const existing = await User.findOne({ email }).select('+passwordHash');
  if (existing) {
    if (existing.role !== 'admin') {
      existing.role = 'admin';
      existing.passwordHash = await bcrypt.hash(password, 10);
      await existing.save();
      console.log(`[system] Admin promoted: ${email}`);
    }
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await User.create({
    email,
    passwordHash,
    name: process.env.INIT_ADMIN_NAME || 'Admin',
    shopName: '—',
    city: '—',
    address: '—',
    role: 'admin',
  });
  console.log(`[system] Admin created: ${email}`);
}
