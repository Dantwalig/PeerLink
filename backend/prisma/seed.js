require('dotenv').config();
const crypto = require('crypto');
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
      tutorVerified: true, // admin-approved, so she shows up in search
      faculty: 'Computer Science',
      yearOfStudy: 3,
      subjects: 'Data Structures, Algorithms, Web Development',
      bio: 'Peer tutor for CS core courses. 20+ sessions completed.',
      rating: 4.8,
    },
  });

  // Deliberately NOT admin-verified yet, so the admin panel has something
  // real to demo: approve him live and watch him appear in search.
  const pendingTutor = await prisma.user.upsert({
    where: { email: `peter.ndayishimiye@${domain}` },
    update: {},
    create: {
      name: 'Peter Ndayishimiye',
      email: `peter.ndayishimiye@${domain}`,
      passwordHash,
      isTutor: true,
      isVerified: true,
      tutorVerified: false,
      faculty: 'Computer Science',
      yearOfStudy: 4,
      subjects: 'Databases, Algorithms',
      bio: 'New peer tutor, awaiting admin approval.',
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: `admin@${domain}` },
    update: {},
    create: {
      name: 'Platform Admin',
      email: `admin@${domain}`,
      passwordHash,
      role: 'ADMIN',
      isVerified: true,
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

  // A recurring weekly series, to show off "repeat weekly" + "remove series"
  const recurrenceGroupId = crypto.randomUUID();
  for (let i = 0; i < 4; i++) {
    await prisma.availability.create({
      data: {
        tutorId: tutor.id,
        startTime: new Date(Date.now() + (48 + i * 168) * 60 * 60 * 1000),
        endTime: new Date(Date.now() + (49 + i * 168) * 60 * 60 * 1000),
        recurrenceGroupId,
      },
    });
  }

  const pastSession = await prisma.tutorSession.create({
    data: {
      studentId: student.id,
      tutorId: tutor.id,
      subject: 'Algorithms',
      startTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
      status: 'COMPLETED',
      location: 'Zoom: peerlink.zoom.us/j/demo123',
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

  const demoPdfBytes = Buffer.from('%PDF-1.4\n% Demo placeholder PDF for PeerLink seed data\n', 'utf-8');
  await prisma.resource.create({
    data: {
      uploaderId: tutor.id,
      title: 'Recursion cheat sheet',
      course: 'CS1102',
      subject: 'Algorithms',
      docType: 'PDF',
      mimeType: 'application/pdf',
      sizeBytes: demoPdfBytes.length,
      data: demoPdfBytes,
    },
  });

  await prisma.notification.createMany({
    data: [
      { userId: student.id, type: 'SESSION_COMPLETED', message: 'Session completed: Algorithms. Please leave a rating.', isRead: false },
      { userId: tutor.id, type: 'NEW_BOOKING_REQUEST', message: 'You have a new booking request', isRead: true },
    ],
  });

  console.log('Seeded demo data:');
  console.log(`  Tutor login:   ${tutor.email} / Password123!`);
  console.log(`  Pending tutor: ${pendingTutor.email} / Password123! (not yet admin-verified)`);
  console.log(`  Student login: ${student.email} / Password123!`);
  console.log(`  Admin login:   ${admin.email} / Password123!`);
  console.log(`  Open availability slot id: ${slot.id}`);
  console.log(`  Recurring series id: ${recurrenceGroupId}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
