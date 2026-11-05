# shuman alarm music

15 original, offline alarm loops used by the per-alarm **Alarm music** picker.
Every track is dedicated to the public domain under CC0 1.0 — see
[`LICENSE.txt`](LICENSE.txt).

## Regenerate

From the project root:

```powershell
python tools\generate-alarm-sounds.py
```

The script uses only the Python standard library. It writes the WAV files here
and prints size, peak, and RMS for each track.

## Use in the app

- Web app preview: `alarm-sounds/<id>.wav` (relative to `index.html`).
- Android ringing: bundled at `assets/www/alarm-sounds/<id>.wav`.
- Per-alarm selection is stored as `sound` (`golden-chime` … `first-light`, or
  `custom`). Imported custom music is copied into the app's internal storage
  and referenced by `customSound` / `customSoundName`.
- If an imported file is missing, Android falls back to `golden-chime`, then to
  the device's default alarm sound.

## Adding a track

1. Add a builder function and an entry in `TRACKS` in
   `tools/generate-alarm-sounds.py`.
2. Run the generator.
3. Add the id, display name, and short note to `ALARM_SOUNDS` in `app.js`.

Keep the id lowercase letters, digits, and hyphens only; native asset lookup
uses that slug directly.
