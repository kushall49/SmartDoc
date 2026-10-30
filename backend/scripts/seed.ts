import { prisma } from '../src/lib/db';
import { hashPassword } from '../src/services/auth.service';

async function seed() {
  console.log('Seeding demo user into PostgreSQL...');

  const email = 'demo@smartdoc.dev';
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    console.log(`Demo user already exists (${email}) — skipping.`);
    process.exit(0);
  }

  const passwordHash = await hashPassword('demo1234');
  const user = await prisma.user.create({
    data: {
      name: 'Demo User',
      email,
      passwordHash,
      role: 'user',
    },
  });

  console.log(`✓ Created demo user in PostgreSQL: ${user.email} / demo1234 (ID: ${user.id})`);
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});

