package com.shuman.clock;

import android.content.Context;

import java.io.File;

/** Shared locations for bundled and imported alarm music. */
public final class AlarmSoundStore {

    public static final String DEFAULT_SOUND = "golden-chime";
    public static final String CUSTOM_SOUND = "custom";
    private static final String DIRECTORY = "alarm-sounds";

    private AlarmSoundStore() {}

    /** Internal directory that mirrors the web app's /custom-sounds/ path. */
    public static File directory(Context context) {
        File dir = new File(context.getFilesDir(), DIRECTORY);
        if (!dir.exists()) {
            //noinspection ResultOfMethodCallIgnored
            dir.mkdirs();
        }
        return dir;
    }

    public static File customFile(Context context, String name) {
        String safe = safeName(name);
        if (safe.isEmpty()) return null;
        return new File(directory(context), safe);
    }

    /** Imported names never contain path separators or characters a URL cannot address. */
    public static String safeName(String name) {
        if (name == null) return "";
        String safe = name.replaceAll("[^A-Za-z0-9._-]", "_");
        if (safe.length() > 120) safe = safe.substring(0, 120);
        if (".".equals(safe) || "..".equals(safe)) return "";
        return safe;
    }

    /** Built-in ids are simple slugs, which keeps asset lookup predictable. */
    public static boolean isBuiltInId(String id) {
        return id != null
                && !CUSTOM_SOUND.equals(id)
                && id.matches("[a-z0-9-]{1,40}");
    }
}
