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
    extendedProperties: { private: { source: "managerclientsradio" } },
  };
  if (event.allDay) {
    const startStr = event.start.toISOString().slice(0, 10);
    const endBase = event.end ? new Date(event.end) : new Date(event.start);
    let endStr = endBase.toISOString().slice(0, 10);
    if (endStr <= startStr) {
      const next = new Date(event.start);
      next.setUTCDate(next.getUTCDate() + 1);
      endStr = next.toISOString().slice(0, 10);
    } else {
      const next = new Date(endBase);
      next.setUTCDate(next.getUTCDate() + 1);
      endStr = next.toISOString().slice(0, 10);
    }
    body.start = { date: startStr };
    body.end = { date: endStr };
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
  try {
    await calendar.events.delete({ calendarId, eventId });
  } catch (e) {
    const code = (e as { code?: number; response?: { status?: number } })?.code ?? (e as { response?: { status?: number } })?.response?.status;
    if (code === 404 || code === 410) return;
    throw e;
  }
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
