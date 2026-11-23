import { google } from "googleapis";

export function getCalendarClient(accessToken: string, refreshToken?: string | null) {
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2.setCredentials({ access_token: accessToken, refresh_token: refreshToken ?? undefined });
  return google.calendar({ version: "v3", auth: oauth2 });
}

export async function createCalendarEvent(
  accessToken: string,
  refreshToken: string | null | undefined,
  calendarId: string,
  event: { title: string; description?: string; start: Date; end?: Date | null; allDay?: boolean }
) {
  const calendar = getCalendarClient(accessToken, refreshToken);
  const body: Record<string, unknown> = {
    summary: event.title,
    description: event.description ?? undefined,
  };
  if (event.allDay) {
    const dateStr = event.start.toISOString().slice(0, 10);
    body.start = { date: dateStr };
    body.end = { date: (event.end ?? event.start).toISOString().slice(0, 10) };
  } else {
    body.start = { dateTime: event.start.toISOString() };
    body.end = { dateTime: (event.end ?? new Date(event.start.getTime() + 3600000)).toISOString() };
  }
  const res = await calendar.events.insert({ calendarId, requestBody: body });
  return res.data.id ?? null;
}

export async function deleteCalendarEvent(
  accessToken: string,
  refreshToken: string | null | undefined,
  calendarId: string,
  eventId: string
) {
  const calendar = getCalendarClient(accessToken, refreshToken);
  await calendar.events.delete({ calendarId, eventId });
}

export async function listCalendarEvents(
  accessToken: string,
  refreshToken: string | null | undefined,
  calendarId: string,
  timeMin: Date,
  timeMax: Date
) {
  const calendar = getCalendarClient(accessToken, refreshToken);
  const res = await calendar.events.list({
    calendarId,
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 250,
  });
  return res.data.items ?? [];
}
