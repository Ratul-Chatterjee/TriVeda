import 'dotenv/config';
import { prisma } from './src/db/config.js';

async function resetDoctors() {
  const doctors = await prisma.hospitalStaff.findMany({
    where: { role: 'DOCTOR' },
    select: { id: true, email: true },
  });

  const doctorIds = doctors.map((doctor) => doctor.id);

  if (doctorIds.length === 0) {
    console.log('No doctor records found to delete.');
    return;
  }

  await prisma.appointment.deleteMany({
    where: { doctorId: { in: doctorIds } },
  });

  await prisma.doctorProfile.deleteMany({
    where: { staffId: { in: doctorIds } },
  });

  await prisma.hospitalStaff.deleteMany({
    where: { id: { in: doctorIds } },
  });

  console.log(`Deleted ${doctorIds.length} doctors.`);
}

resetDoctors()
  .catch((error) => {
    console.error('Doctor reset failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
