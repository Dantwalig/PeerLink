/**
 * Calendar integration - NOT Google Calendar.
 *
 * Why: Google Calendar's API requires an OAuth consent flow (a registered
 * Google Cloud project, a verified app, per-user authorization) which is
 * heavy infrastructure for a student project and has nothing to do with
 * PeerLink's own functionality. The practical alternative used here is the
 * iCalendar (.ics) standard - a plain-text file format supported natively
 * by Google Calendar, Outlook, Apple Calendar, and effectively every
 * calendar app that exists. Generating one requires no API key, no OAuth,
 * and no third-party account at all, and the user still ends up with the
 * session on whichever calendar they actually use.
 *
 * This is genuinely functional, not a stub - see routes/sessions.js's
 * GET /:id/calendar.ics route, and the built-in in-app calendar view
 * (frontend CalendarView.jsx) which covers the "no alternative -> built-in
 * calendar" fallback directly inside PeerLink.
 */

function formatICSDate(date) {
  return new Date(date).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function escapeICSText(text) {
  return String(text).replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');
}

function buildSessionICS(session) {
  const uid = `peerlink-session-${session.id}@peerlink`;
  const now = formatICSDate(new Date());
  const start = formatICSDate(session.startTime);
  const end = formatICSDate(session.endTime);
  const summary = escapeICSText(`PeerLink: ${session.subject}`);
  const description = escapeICSText(
    `Tutoring session between ${session.student?.name || 'student'} and ${session.tutor?.name || 'tutor'}.` +
    (session.location ? ` Location: ${session.location}` : ''),
  );
  const location = escapeICSText(session.location || '');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PeerLink//Session Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    location ? `LOCATION:${location}` : null,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');
}

module.exports = { buildSessionICS };
