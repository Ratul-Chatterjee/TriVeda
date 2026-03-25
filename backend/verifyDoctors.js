import 'dotenv/config';
import { prisma } from './src/db/config.js';

async function verifyDoctors() {
  const total = await prisma.hospitalStaff.count({ where: { role: 'DOCTOR' } });
  const nullDept = await prisma.doctorProfile.count({ where: { departmentId: null } });
  const sample = await prisma.hospitalStaff.findMany({
    where: { role: 'DOCTOR' },
    orderBy: { createdAt: 'asc' },
    take: 8,
    select: { name: true, email: true },
  });

  console.log({ total, nullDept, sample });
}

verifyDoctors()
  .catch((error) => {
    console.error('Doctor verification failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
