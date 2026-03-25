import 'dotenv/config';
import { prisma } from './src/db/config.js';
import bcrypt from 'bcryptjs';

const DEFAULT_PASSWORD = 'doctor123';

const INDIAN_FIRST_NAMES = [
  'Aarav', 'Vivaan', 'Aditya', 'Arjun', 'Ishaan', 'Krishna',
  'Rohan', 'Karan', 'Rahul', 'Siddharth', 'Ananya', 'Aadhya',
  'Diya', 'Ira', 'Kavya', 'Meera', 'Naina', 'Priya',
  'Riya', 'Sneha', 'Aditi', 'Pooja', 'Neha', 'Shreya',
  'Tanvi', 'Isha', 'Manav', 'Yash', 'Harsh', 'Nikhil',
  'Dev', 'Om', 'Sai', 'Varun', 'Aniket', 'Ritvik',
];

const INDIAN_LAST_NAMES = [
  'Sharma', 'Patel', 'Verma', 'Rao', 'Gupta', 'Mehta',
  'Iyer', 'Nair', 'Kapoor', 'Singh', 'Das', 'Joshi',
  'Kulkarni', 'Reddy', 'Malhotra', 'Bansal', 'Saxena', 'Mishra',
  'Agarwal', 'Chopra', 'Pandey', 'Yadav', 'Jain', 'Chauhan',
  'Kumar', 'Tiwari', 'Sinha', 'Pillai', 'Menon', 'Bhatia',
  'Goyal', 'Desai', 'Trivedi', 'Bhatt', 'Shukla', 'Sethi',
];

async function seedDoctors() {
  console.log('🌱 Seeding dummy doctors (3 per department)...');

  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  let hospital = await prisma.hospital.findFirst({
    orderBy: { id: 'asc' },
    select: { id: true, name: true },
  });

  if (!hospital) {
    hospital = await prisma.hospital.create({
      data: {
        name: 'City Hospital',
        address: 'Ahmedabad, Gujarat',
      },
      select: { id: true, name: true },
    });
    console.log(`🏥 Created hospital: ${hospital.name}`);
  }

  const departments = await prisma.department.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  });

  if (departments.length === 0) {
    throw new Error('No departments found. Run seedDepartments.js first.');
  }

  let currentDoctorCount = await prisma.hospitalStaff.count({
    where: { role: 'DOCTOR' },
  });

  let nameCursor = 0;

  for (const department of departments) {
    for (let index = 1; index <= 3; index += 1) {
      const serialNumber = currentDoctorCount + 1;
      const firstName = INDIAN_FIRST_NAMES[nameCursor % INDIAN_FIRST_NAMES.length];
      const lastName = INDIAN_LAST_NAMES[nameCursor % INDIAN_LAST_NAMES.length];
      const email = `${firstName}${serialNumber}@cityhospital.com`;
      const doctorName = `Dr. ${firstName} ${lastName}`;
      nameCursor += 1;
      currentDoctorCount += 1;

      const staff = await prisma.hospitalStaff.create({
        data: {
          email,
          password: hashedPassword,
          name: doctorName,
          role: 'DOCTOR',
          hospitalId: hospital.id,
        },
        select: { id: true, email: true },
      });

      await prisma.doctorProfile.create({
        data: {
          specialty: department.name,
          experienceYrs: 4 + index,
          isAvailable: true,
          departmentId: department.id,
          staffId: staff.id,
        },
      });

      console.log(`✅ ${department.name}: ${staff.email}`);
    }
  }

  console.log('\n🎉 Doctor seeding complete!');
  console.log(`🔐 Default doctor password: ${DEFAULT_PASSWORD}`);
}

seedDoctors()
  .catch((error) => {
    console.error('❌ Doctor seeding failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
