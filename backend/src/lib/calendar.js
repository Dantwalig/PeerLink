/**
 * STUB: Google Calendar API v3 (SRS 3.3 Software Interfaces, FR4.2).
 * Returns a fake event id instead of creating a real calendar event.
 *
 * To go live: register a Google Cloud project, add OAuth2 credentials,
 * and replace createCalendarEvent() with a real calendar.events.insert call.
 */
async function createCalendarEvent(session) {
  const fakeEventId = `gcal-stub-${Date.now()}`;
  console.log(`[STUB Google Calendar] Created event ${fakeEventId} for session ${session.id}`);
  return fakeEventId;
}

module.exports = { createCalendarEvent };
