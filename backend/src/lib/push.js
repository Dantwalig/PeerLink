/**
 * FR9 Notifications - stored entirely in Postgres, viewed in-app via the
 * Notifications page. This is a deliberate choice, not a placeholder for
 * Firebase Cloud Messaging: it keeps the whole system on one dependency
 * (the database already in use for everything else), with no third-party
 * push service, no device tokens to manage, and no extra cost.
 *
 * The tradeoff: a user only sees a new notification when they open the app,
 * not as an OS-level push while it's closed. If that's ever needed, Web
 * Push (browser-native, no vendor lock-in, no Firebase account required)
 * is a lighter-weight next step than FCM - but it's a genuinely separate
 * feature, not a "finish the stub" task.
 */
const prisma = require('./prisma');

async function notify(userId, type, message) {
  return prisma.notification.create({ data: { userId, type, message } });
}

module.exports = { notify };
