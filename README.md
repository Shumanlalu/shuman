# shuman — time, in motion

A small, self-contained clock app with a living analog face, world clocks, alarms, a focus timer, a countdown timer, and a stopwatch.

**Android APK:** [Download the latest release](https://github.com/Shumanlalu/shuman/releases/latest) · **Live web demo:** [shumanlalu.github.io/shuman](https://shumanlalu.github.io/shuman/)

> The browser demo runs fully offline once loaded, but alarms only ring while its tab is open. Install the Android APK for full-screen alarms that ring when the app is closed.

## Run it

Open `index.html` directly in a modern browser, or serve the folder locally:

```powershell
python -m http.server 4173
```

Then visit <http://127.0.0.1:4173>.

No build step, dependencies, or tracking. The typefaces are bundled in `fonts/`, so the web app is fully offline too.

## Android app

A native Android wrapper lives in `android/` and uses this same web app — there is no duplicate UI. The build copies `index.html`, `styles.css`, `app.js`, `fonts/`, and `alarm-sounds/` into the APK's assets every time.

Build an installable debug APK:

```powershell
.\build-android.cmd
```

The APK is written to `android\app\build\outputs\apk\debug\app-debug.apk`. The app ID is `com.shuman.clock`; it supports Android 6.0 (API 23) and newer.

Install it on a USB-connected device with developer options and USB debugging enabled:

```powershell
.\build-android.cmd -Install
```

The build script expects JDK 17 at `%USERPROFILE%\.jdks\jdk-17` and the Android SDK at `%LOCALAPPDATA%\Android\Sdk`. Override either with `JAVA_HOME` / `ANDROID_HOME`. On a fresh machine, `android\tools\setup-sdk.ps1` accepts the SDK licenses and installs the required packages.

The Android app has **no internet permission**. Clock logic, themes, fonts, saved preferences, and alarms all work offline. The Android status and navigation bars follow the in-app dark/light theme.

### Alarms on Android

- Set a time, an optional label, and any repeat days. With no days selected the alarm rings once at the next occurrence.
- Alarms are armed with `AlarmManager.setAlarmClock` — exact, wakes the device even in deep Doze, needs no extra permission, and behaves identically from Android 6 through 15 — plus a native mirror, so they survive app closure, reboots, updates, time changes, and time-zone changes.
- When an alarm fires, a foreground `mediaPlayback` service starts **immediately** and plays the alarm's selected music and vibration. Audio never waits for the notification to be tapped. The service also posts a silent, high-importance alarm notification with a full-screen intent, **Snooze 5 min**, and **Dismiss** actions.
- On a locked or screen-off device, the full-screen intent opens the ringing screen over the lock screen and turns the display on. When the device is already unlocked, Android shows the alarm as a heads-up notification instead (that is Android's normal behavior); the music is already ringing by then. **Snooze** and **Dismiss** work from either the notification or the ringing screen.
- Choose from 15 bundled CC0 tracks, preview them in the alarm editor, or import your own audio (MP3, M4A, AAC, OGG/Opus, WAV, FLAC, MIDI, 3GP, or AMR; up to 30 MB). Imported music is copied into the app's private storage and plays natively while the app is closed. If a custom file disappears, the alarm falls back to **Golden Chime**, then to the device's default alarm sound.
- The 15 built-in tracks are original and released under CC0 1.0; see `alarm-sounds/LICENSE.txt`. Regenerate them with `python tools\generate-alarm-sounds.py`.
- Allow **notifications**, **exact alarms**, and **full-screen alerts** from the alarm screen. Android 13+ asks for notifications; Android 12+ uses the exact-alarm settings screen; Android 14+ uses full-screen intent settings. If full-screen alerts are denied on Android 14+, the alarm still rings immediately through the foreground service and shows a high-importance heads-up notification; granting full-screen access restores the lock-screen takeover.
- Dismissing a one-time alarm switches it off. Repeating alarms stay on and schedule their next occurrence automatically.
- Alarms ring while shuman is closed; the app does not need to be running for the native alarm path.

If a build fails with a file-lock error while cleaning, pause OneDrive syncing for this folder or delete `android\app\build` manually; OneDrive can temporarily lock generated files.

On phones with aggressive battery managers (Xiaomi/HyperOS, EMUI, ColorOS, Realme), also allow shuman to **autostart** and remove it from battery optimization; otherwise those systems may delay or drop the alarm broadcast itself.

## What's inside

- **Clock** — smoothly sweeping analog hands in five face styles (Heritage, Neon, Minimal, Roman, Orbit), a big digital readout, day progress, word clock, binary clock, and day/week/month/year progress rings.
- **World** — eight live city clocks with accurate time zones, day/night halos, offsets, and today/tomorrow labels.
- **Alarm** — one-time and repeating alarms with labels, day chips, per-alarm music (15 bundled tracks or your own audio), preview, a next-alarm readout, native Android ringing, snooze, and permission guidance.
- **Focus** — a 25/5/15 Pomodoro cycle with an intention field, daily session stats, ambient brown-noise soundscape, and a completion chime.
- **Timer** — quick presets, a custom duration, a named countdown, progress ring, and optional finish sound.
- **Stopwatch** — hundredth-of-a-second timing with laps, splits, and keyboard shortcuts.
- **Zen mode** — a distraction-free full-screen clock.

## Details

- Accent palettes (amber, mint, iris, rose, sky, ember, sage, paper) plus a custom colour picker.
- Auto, dark, and light themes. Auto follows the system theme live.
- Four backdrops — Aurora, Mesh, Grid, and Plain — with motion and starfield controls in the Personalize sheet.
- Four one-tap moods: **Editorial** (Roman numerals, amber, aurora), **Arcade** (neon, grid, living colour), **Paper** (light, minimal, bare), and **Cosmos** (orbit face, iris, mesh).
- **Living colour** slowly drifts the accent through neighbouring hues, and an optional **signature** replaces “time, in motion.” in the footer.
- 12/24-hour switching.
- Everything you personalize (theme, accent, face, backdrop, motion, starfield, living colour, signature, alarms, timer name, intention, focus stats) is stored locally on your device.
- The word clock rounds to the nearest five minutes; the binary clock uses BCD (8·4·2·1).
- Ambient sound is generated live with the Web Audio API — there are no audio files. The only bundled audio is the 15 CC0 alarm loops in `alarm-sounds/`.
- The favicon is a tiny live analog clock.
- Respects `prefers-reduced-motion`, and offers an explicit reduced-motion switch.

## Keyboard

| Key | Action |
| --- | --- |
| `1`–`6` | Switch views |
| `Z` | Toggle zen mode |
| `S` | Toggle ambient sound |
| `P` | Open personalization |
| `Space` | Start / pause stopwatch |
| `L` | Record a lap (stopwatch) |
| `Esc` | Close zen mode or personalization |
