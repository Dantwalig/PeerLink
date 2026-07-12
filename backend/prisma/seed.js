require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Password123!', 12);
  const domain = process.env.INSTITUTIONAL_EMAIL_DOMAIN || 'alueducation.com';

  const tutor = await prisma.user.upsert({
    where: { email: `grace.uwase@${domain}` },
    update: {},
    create: {
      name: 'Grace Uwase',
      email: `grace.uwase@${domain}`,
      passwordHash,
      isTutor: true,
      isVerified: true,
      faculty: 'Computer Science',
      yearOfStudy: 3,
      subjects: 'Data Structures, Algorithms, Web Development',
      bio: 'Peer tutor for CS core courses. 20+ sessions completed.',
      rating: 4.8,
    },
  });

  const student = await prisma.user.upsert({
    where: { email: `jean.mugisha@${domain}` },
    update: {},
    create: {
      name: 'Jean Mugisha',
      email: `jean.mugisha@${domain}`,
      passwordHash,
      isTutor: false,
      isVerified: true,
      faculty: 'Computer Science',
      yearOfStudy: 1,
      subjects: 'Looking for help in Algorithms',
    },
  });

  const slot = await prisma.availability.create({
    data: {
      tutorId: tutor.id,
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() + 25 * 60 * 60 * 1000),
    },
  });

  await prisma.availability.create({
    data: {
      tutorId: tutor.id,
      startTime: new Date(Date.now() + 48 * 60 * 60 * 1000),
      endTime: new Date(Date.now() + 49 * 60 * 60 * 1000),
    },
  });

  const pastSession = await prisma.tutorSession.create({
    data: {
      studentId: student.id,
      tutorId: tutor.id,
      subject: 'Algorithms',
      startTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
      status: 'COMPLETED',
    },
  });

  await prisma.rating.create({
    data: {
      sessionId: pastSession.id,
      fromUserId: student.id,
      toUserId: tutor.id,
      score: 5,
      comment: 'Explained recursion really clearly, highly recommend!',
    },
  });

  await prisma.studyGroup.create({
    data: {
      creatorId: tutor.id,
      name: 'Algorithms Study Circle',
      description: 'Weekly problem-solving session for CS1102 students.',
      subjectTag: 'Algorithms',
      memberships: { create: { userId: tutor.id, status: 'APPROVED' } },
    },
  });

  console.log('Seeded demo data:');
  console.log(`  Tutor login:   ${tutor.email} / Password123!`);
  console.log(`  Student login: ${student.email} / Password123!`);
  console.log(`  Open availability slot id: ${slot.id}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
