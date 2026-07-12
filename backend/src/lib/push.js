/**
 * STUB: Firebase Cloud Messaging (SRS 3.3 Software Interfaces, FR9).
 * Stores the notification in Postgres instead of pushing to a device.
 *
 * To go live: add Firebase Admin SDK credentials, store each user's FCM
 * device token, and call admin.messaging().send(...) inside notify().
 */
const prisma = require('./prisma');

async function notify(userId, type, message) {
  console.log(`[STUB FCM] -> user ${userId} [${type}]: ${message}`);
  return prisma.notification.create({ data: { userId, type, message } });
}

module.exports = { notify };
