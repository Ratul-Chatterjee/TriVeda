import 'dotenv/config';
import { prisma } from './src/db/config.js';

async function main() {
  const recent = await prisma.appointment.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true,
      createdAt: true,
      patientId: true,
      doctorId: true,
      scheduledAt: true,
      status: true,
      problemDescription: true,
      patientSymptoms: true,
      severity: true,
      duration: true,
      aiSummary: true,
      doctorNotes: true,
      medications: true,
      routinePlan: true,
      paymentStatus: true,
    },
  });

  console.log(JSON.stringify(recent, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
