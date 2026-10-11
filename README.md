# Desk dashboard for the S21 FE

A swipeable landscape dashboard: Home (clock, weather, calendar, to-do), Player (Spotify), Lyrics (synced), Dates (exam countdowns and assignments), Tools (timers, alarm, night mode).

Open it with `?demo` at the end of the address to preview everything without any keys.

## 1. Spotify (about 3 minutes)
1. Go to developer.spotify.com/dashboard and create an app. Tick "Web API".
2. Add a Redirect URI that matches your deployed address exactly, for example `https://desk-dash.vercel.app/`. The Settings sheet shows the exact value to paste.
3. Copy the Client ID into Settings on the phone. Tap Connect Spotify and approve.
4. Spotify Premium is needed for the play, pause, skip, seek, shuffle, repeat and volume buttons.

## 2. Notion tasks
1. notion.so/profile/integrations -> New integration -> copy the token.
2. Open your Operating System page in Notion -> ... -> Connections -> add the integration. This shares the Tasks and Assignments databases with it.
3. The database IDs are already the defaults in `api/tasks.js`.

## 3. Calendar
In Google Calendar: Settings -> your calendar -> Integrate calendar -> "Secret address in iCal format". Copy it. Anyone with that link can read the calendar, so keep it private.

## 4. Deploy on Vercel
1. Put this folder in a GitHub repo, import it in Vercel (or run `npx vercel` here).
2. Environment variables:
   - `NOTION_TOKEN`: from step 2
   - `ICS_URL`: from step 3
   - `DASH_KEY`: any long random string you make up
   - `TASKS_DB` and `ASSIGNMENTS_DB`: optional, defaults are set
3. Open the deployed address on the phone, long-press the clock (or Tools -> Settings), and enter the Spotify Client ID and the same `DASH_KEY`. Latitude and longitude default to Singapore.

## 5. Fully Kiosk Browser
- Start URL: your Vercel address.
- Web Content Settings: enable JavaScript, "Enable Fullscreen Video", "Autoplay Media" on.
- Device Management: Keep Screen On on, Screen Orientation Landscape, "Disable Status Bar" on if you buy Plus.
- Motion detection and screen schedules are Plus features. The app's own night mode already dims the picture at night.
- Android: Developer options -> Stay awake while charging. Samsung: Battery -> Protect battery (85% cap).
- Tap the screen once after opening it so the alarm sound is allowed.

## Things to know
- Tasks refresh every 20 seconds, the calendar every 5 minutes. Ticking a task writes Done back to Notion.
- Lyrics come from LRCLIB (free). Not every song has synced lyrics; the page falls back to plain lyrics or a message.
- The screen shifts a few pixels every 4 minutes and returns to Player or Home after 2 minutes untouched, to avoid burn-in.
- Voice ("Hey Google") is handled by Android, not this page.
