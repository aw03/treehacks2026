export function getNowInTimeZone(tz: string) {
    // Uses Intl to avoid extra deps; returns local hours/minutes in that timezone.
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date());
  
    const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
    const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
    const minutesSinceMidnight = hour * 60 + minute;
  
    return { hour, minute, minutesSinceMidnight };
  }
  
  export function computeWalkInStatus(params: {
    timezone: string;
    walkInEnabled: boolean;
    walkInStartMin: number;
    walkInEndMin: number;
  }) {
    const { timezone, walkInEnabled, walkInStartMin, walkInEndMin } = params;
  
    if (!walkInEnabled) {
      return { openNow: false, reason: "Walk-ins disabled" as const };
    }
  
    let now;
    try {
      now = getNowInTimeZone(timezone);
    } catch {
      // Fallback if timezone is invalid
      now = { hour: new Date().getHours(), minute: new Date().getMinutes(), minutesSinceMidnight: new Date().getHours() * 60 + new Date().getMinutes() };
    }
  
    const openNow = now.minutesSinceMidnight >= walkInStartMin && now.minutesSinceMidnight < walkInEndMin;
  
    if (!openNow) {
      return { openNow: false, reason: "Outside walk-in window" as const };
    }
  
    const closesInMin = Math.max(0, walkInEndMin - now.minutesSinceMidnight);
    return { openNow: true, closesInMin };
  }
  