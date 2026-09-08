/**
 * GoLuQ booking bridge — Google Apps Script.
 *
 * Mirrors bookings from the "GoLuQ discovery call" appointment schedule into
 * goluq.com, so the cockpit shows upcoming calls, Telegram announces each one,
 * and WhatsApp reminders can go out. The calendar stays the source of truth.
 *
 * Install (5 minutes, once):
 *   1. script.google.com → New project → paste this file → save.
 *   2. Project Settings → Script properties → add:
 *        SECRET   = the "Calendar bridge secret" from goluq.com/admin → Settings
 *        CALENDAR = the calendar id (usually your Gmail address)
 *        MATCH    = GoLuQ discovery call        (text that appears in the event title)
 *   3. Run `syncBookings` once from the editor and grant the permissions it asks for.
 *   4. Triggers (clock icon) → Add trigger → syncBookings → Time-driven → every 10 minutes.
 *
 * Nothing else. Cancellations are picked up because the script re-posts the
 * events it saw last time and marks the ones that vanished.
 */

const ENDPOINT = "https://goluq.com/api/bookings/inbound";

function syncBookings() {
  const props = PropertiesService.getScriptProperties();
  const secret = props.getProperty("SECRET");
  const calId = props.getProperty("CALENDAR") || Session.getActiveUser().getEmail();
  const match = (props.getProperty("MATCH") || "GoLuQ discovery call").toLowerCase();
  if (!secret) throw new Error("Set the SECRET script property first.");

  const cal = CalendarApp.getCalendarById(calId);
  const now = new Date();
  const horizon = new Date(now.getTime() + 60 * 24 * 3600 * 1000);
  const events = cal.getEvents(new Date(now.getTime() - 24 * 3600 * 1000), horizon)
    .filter((e) => (e.getTitle() || "").toLowerCase().indexOf(match) >= 0);

  const seen = {};
  events.forEach((e) => {
    const guest = firstGuest(e);
    const payload = {
      secret: secret,
      event_id: e.getId(),
      name: guest.name || e.getTitle(),
      email: guest.email,
      phone: extractPhone(e.getDescription() || ""),
      starts_at: e.getStartTime().toISOString(),
      ends_at: e.getEndTime().toISOString(),
      meet_url: meetLink(e),
      note: cleanNote(e.getDescription() || ""),
      status: "booked",
    };
    post(payload);
    seen[e.getId()] = true;
  });

  // Anything we posted before that is no longer on the calendar was cancelled.
  const prev = JSON.parse(props.getProperty("SEEN") || "{}");
  Object.keys(prev).forEach((id) => {
    if (!seen[id]) post({ secret: secret, event_id: id, name: prev[id] || "Cancelled", starts_at: new Date().toISOString(), status: "cancelled" });
  });
  const remember = {};
  events.forEach((e) => { remember[e.getId()] = firstGuest(e).name || e.getTitle(); });
  props.setProperty("SEEN", JSON.stringify(remember));
}

function firstGuest(e) {
  const guests = e.getGuestList().filter((g) => g.getEmail() !== Session.getActiveUser().getEmail());
  if (!guests.length) return { name: "", email: "" };
  const g = guests[0];
  return { name: g.getName() || "", email: g.getEmail() || "" };
}

function meetLink(e) {
  try {
    const url = e.getConferenceUrl ? e.getConferenceUrl() : "";
    if (url) return url;
  } catch (err) { /* older runtime */ }
  const m = (e.getDescription() || "").match(/https:\/\/meet\.google\.com\/[a-z-]+/);
  return m ? m[0] : "";
}

/** The booking form puts answers in the description; pull a phone number out. */
function extractPhone(desc) {
  const m = desc.replace(/\s+/g, " ").match(/(\+?\d[\d\s-]{8,}\d)/);
  return m ? m[1].replace(/[\s-]/g, "") : "";
}

/** Strip the boilerplate Google adds and keep the answers. */
function cleanNote(desc) {
  return desc
    .replace(/https:\/\/\S+/g, "")
    .replace(/Booked by .*$/gim, "")
    .replace(/Need to make changes.*$/gim, "")
    .replace(/\n{2,}/g, "\n")
    .trim()
    .slice(0, 1500);
}

function post(payload) {
  UrlFetchApp.fetch(ENDPOINT, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
}
