import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';

const EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const NAME = process.env.ADMIN_NAME || 'Admin';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);

  const existing = await User.findOne({ email: EMAIL }).select('+passwordHash');
  if (existing) {
    existing.role = 'admin';
    existing.passwordHash = await bcrypt.hash(PASSWORD, 10);
    await existing.save();
    console.log(`Updated: ${EMAIL} — role=admin, password reset`);
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  await User.create({
    email: EMAIL,
    passwordHash,
    name: NAME,
    shopName: '—',
    city: '—',
    address: '—',
    role: 'admin',
  });
  console.log(`Admin created: ${EMAIL} / ${PASSWORD}`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
