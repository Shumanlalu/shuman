package com.shuman.clock;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Stores the alarm mirror and keeps AlarmManager in sync with the web app.
 * The web app remains the source of truth; this class only mirrors its JSON.
 */
public final class AlarmScheduler {

    public static final String ACTION_FIRE = "com.shuman.clock.ALARM_FIRE";
    public static final String EXTRA_ID = "alarm_id";
    public static final String EXTRA_HOUR = "alarm_hour";
    public static final String EXTRA_MINUTE = "alarm_minute";
    public static final String EXTRA_LABEL = "alarm_label";
    public static final String EXTRA_SNOOZE = "alarm_snooze";
    public static final String EXTRA_SOUND = "alarm_sound";
    public static final String EXTRA_CUSTOM_SOUND = "alarm_custom_sound";
    public static final String EXTRA_CUSTOM_SOUND_NAME = "alarm_custom_sound_name";
    public static final String DEFAULT_SOUND = AlarmSoundStore.DEFAULT_SOUND;
    public static final String CUSTOM_SOUND = AlarmSoundStore.CUSTOM_SOUND;
    public static final int SNOOZE_MINUTES = 5;

    private static final String PREFS = "shuman_alarms";
    private static final String KEY_ALARMS = "alarms_json";
    private static final String KEY_EVENTS = "alarm_events_json";
    private static final int SHOW_APP_REQUEST_CODE = 0x5AF00D;
    private static final Object LOCK = new Object();

    private final Context context;
    private final AlarmManager alarmManager;

    public AlarmScheduler(Context context) {
        this.context = context.getApplicationContext();
        this.alarmManager = (AlarmManager) this.context.getSystemService(Context.ALARM_SERVICE);
    }

    public static final class Alarm {
        public String id = "";
        public int hour = 7;
        public int minute = 0;
        public String label = "";
        public boolean enabled = true;
        public boolean once = true;
        public long at = 0L;
        public int[] days = new int[0];
        public String sound = DEFAULT_SOUND;
        public String customSound = "";
        public String customSoundName = "";
    }

    public synchronized boolean sync(String json) {
        if (json == null) json = "[]";

        List<Alarm> next;
        try {
            next = parseAlarms(json);
        } catch (JSONException error) {
            return false;
        }

        synchronized (LOCK) {
            List<Alarm> previous = readAlarmsLocked();
            Set<String> nextIds = new HashSet<>();
            for (Alarm alarm : next) nextIds.add(alarm.id);

            for (Alarm alarm : previous) {
                cancelRegular(alarm.id);
                if (!nextIds.contains(alarm.id)) cancelSnooze(alarm.id);
            }

            SharedPreferences preferences = prefs();
            preferences.edit().putString(KEY_ALARMS, json).apply();

            for (Alarm alarm : next) {
                if (alarm.enabled) schedule(alarm);
            }
        }
        return true;
    }

    public synchronized Alarm findById(String id) {
        if (id == null) return null;
        synchronized (LOCK) {
            for (Alarm alarm : readAlarmsLocked()) {
                if (id.equals(alarm.id)) return alarm;
            }
        }
        return null;
    }

    public synchronized void schedule(Alarm alarm) {
        if (alarm == null || !alarm.enabled) return;
        long triggerAt = nextTrigger(alarm, System.currentTimeMillis());
        if (triggerAt <= 0L) return;
        scheduleAt(alarm, triggerAt, false);
    }

    public synchronized void scheduleSnooze(Alarm alarm) {
        if (alarm == null) return;
        long triggerAt = System.currentTimeMillis() + SNOOZE_MINUTES * 60_000L;
        scheduleAt(alarm, triggerAt, true);
    }

    private void scheduleAt(Alarm alarm, long triggerAt, boolean snooze) {
        Intent intent = new Intent(context, AlarmReceiver.class);
        intent.setAction(ACTION_FIRE);
        putExtras(intent, alarm, snooze);

        int requestCode = snooze ? snoozeRequestCode(alarm.id) : requestCode(alarm.id);
        PendingIntent pendingIntent = PendingIntent.getBroadcast(
                context,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        if (alarmManager == null) return;

        // setAlarmClock is the alarm-clock API: exact, wakes the device even in
        // deep Doze, needs no extra permission, and works the same way from
        // Android 6 through 15. It is the most reliable path for user alarms.
        try {
            alarmManager.setAlarmClock(
                    new AlarmManager.AlarmClockInfo(triggerAt, openAppIntent()), pendingIntent);
            return;
        } catch (Exception ignored) {
            // A few OEMs reject it; fall back to the generic exact APIs below.
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (canScheduleExact(this.context)) {
                try {
                    alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent);
                    return;
                } catch (SecurityException ignored) {
                    // Permission changed while scheduling; fall back further.
                }
            }
            alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent);
        } else {
            alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent);
        }
    }

    /** The clock face the system shows when the alarm-clock icon is tapped. */
    private PendingIntent openAppIntent() {
        Intent intent = new Intent(context, MainActivity.class);
        return PendingIntent.getActivity(
                context,
                SHOW_APP_REQUEST_CODE,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    public synchronized void cancelAlarm(String id) {
        cancelRegular(id);
        cancelSnooze(id);
    }

    private void cancelRegular(String id) {
        PendingIntent pendingIntent = PendingIntent.getBroadcast(
                context,
                requestCode(id),
                fireIntent(id),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        if (alarmManager != null) alarmManager.cancel(pendingIntent);
        pendingIntent.cancel();
    }

    private void cancelSnooze(String id) {
        PendingIntent pendingIntent = PendingIntent.getBroadcast(
                context,
                snoozeRequestCode(id),
                fireIntent(id),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        if (alarmManager != null) alarmManager.cancel(pendingIntent);
        pendingIntent.cancel();
    }

    private Intent fireIntent(String id) {
        Intent intent = new Intent(context, AlarmReceiver.class);
        intent.setAction(ACTION_FIRE);
        intent.putExtra(EXTRA_ID, id);
        return intent;
    }

    /** Called when an alarm is dismissed. One-time alarms are switched off in the mirror. */
    public synchronized void markDismissed(String id) {
        synchronized (LOCK) {
            List<Alarm> alarms = readAlarmsLocked();
            boolean changed = false;
            for (Alarm alarm : alarms) {
                if (id.equals(alarm.id) && alarm.once && alarm.enabled) {
                    alarm.enabled = false;
                    changed = true;
                }
            }
            if (changed) writeAlarmsLocked(alarms);
            addEventLocked(id, "dismiss", 0L);
        }
    }

    public static void addEvent(Context context, String id, String action, long at) {
        synchronized (LOCK) {
            SharedPreferences preferences = context.getApplicationContext()
                    .getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            addEvent(preferences, id, action, at);
        }
    }

    private void addEventLocked(String id, String action, long at) {
        addEvent(prefs(), id, action, at);
    }

    private static void addEvent(SharedPreferences preferences, String id, String action, long at) {
        try {
            String raw = preferences.getString(KEY_EVENTS, "[]");
            JSONArray events = new JSONArray(raw == null ? "[]" : raw);
            JSONObject event = new JSONObject();
            event.put("id", id);
            event.put("action", action);
            event.put("at", at);
            events.put(event);
            while (events.length() > 50) events.remove(0);
            preferences.edit().putString(KEY_EVENTS, events.toString()).apply();
        } catch (JSONException ignored) {
            // Events are advisory; a broken log should never break ringing.
        }
    }

    /** Returns newline-free JSON and clears the event log. */
    public synchronized String consumeEvents() {
        synchronized (LOCK) {
            SharedPreferences preferences = prefs();
            String raw = preferences.getString(KEY_EVENTS, "[]");
            preferences.edit().putString(KEY_EVENTS, "[]").apply();
            return raw == null ? "[]" : raw;
        }
    }

    public synchronized void rescheduleAll() {
        synchronized (LOCK) {
            String raw = prefs().getString(KEY_ALARMS, null);
            if (raw != null) sync(raw);
        }
    }

    /** Copies everything the ringing service and screen need into an intent. */
    public static void putExtras(Intent intent, Alarm alarm, boolean snooze) {
        if (intent == null || alarm == null) return;
        intent.putExtra(EXTRA_ID, alarm.id);
        intent.putExtra(EXTRA_HOUR, alarm.hour);
        intent.putExtra(EXTRA_MINUTE, alarm.minute);
        intent.putExtra(EXTRA_LABEL, alarm.label);
        intent.putExtra(EXTRA_SOUND, alarm.sound);
        intent.putExtra(EXTRA_CUSTOM_SOUND, alarm.customSound);
        intent.putExtra(EXTRA_CUSTOM_SOUND_NAME, alarm.customSoundName);
        intent.putExtra(EXTRA_SNOOZE, snooze);
    }

    /** Rebuilds an alarm from fire/notification-action extras without touching storage. */
    public static Alarm fromIntent(Intent intent) {
        if (intent == null) return null;
        String id = intent.getStringExtra(EXTRA_ID);
        if (id == null || id.isEmpty()) return null;

        Alarm alarm = new Alarm();
        alarm.id = id;
        alarm.hour = Math.max(0, Math.min(23, intent.getIntExtra(EXTRA_HOUR, 7)));
        alarm.minute = Math.max(0, Math.min(59, intent.getIntExtra(EXTRA_MINUTE, 0)));
        alarm.label = intent.getStringExtra(EXTRA_LABEL);
        if (alarm.label == null) alarm.label = "";
        alarm.label = alarm.label.trim();
        if (alarm.label.length() > 32) alarm.label = alarm.label.substring(0, 32);
        alarm.enabled = true;
        alarm.once = true;
        alarm.sound = intent.getStringExtra(EXTRA_SOUND);
        if (alarm.sound == null || alarm.sound.isEmpty()) alarm.sound = DEFAULT_SOUND;
        alarm.customSound = AlarmSoundStore.safeName(
                intent.getStringExtra(EXTRA_CUSTOM_SOUND));
        alarm.customSoundName = intent.getStringExtra(EXTRA_CUSTOM_SOUND_NAME);
        if (alarm.customSoundName == null) alarm.customSoundName = "";
        alarm.customSoundName = alarm.customSoundName.trim();
        if (alarm.customSoundName.length() > 60) {
            alarm.customSoundName = alarm.customSoundName.substring(0, 60);
        }
        if (CUSTOM_SOUND.equals(alarm.sound) && alarm.customSound.isEmpty()) {
            alarm.sound = DEFAULT_SOUND;
        }
        if (!CUSTOM_SOUND.equals(alarm.sound) && !AlarmSoundStore.isBuiltInId(alarm.sound)) {
            alarm.sound = DEFAULT_SOUND;
        }
        return alarm;
    }

    public static int requestCode(String id) {
        return (id == null ? 0 : id.hashCode()) & 0x0FFFFFFF;
    }

    public static int snoozeRequestCode(String id) {
        return (requestCode(id) ^ 0x05EED5EE) & 0x0FFFFFFF;
    }

    public static int notificationId(String id) {
        return requestCode(id) + 1;
    }

    public static boolean canScheduleExact(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true;
        AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        return manager != null && manager.canScheduleExactAlarms();
    }

    public static long nextTrigger(Alarm alarm, long now) {
        if (alarm == null || !alarm.enabled) return 0L;

        if (alarm.days != null && alarm.days.length > 0) {
            Calendar calendar = Calendar.getInstance();
            calendar.setTimeInMillis(now);
            calendar.set(Calendar.HOUR_OF_DAY, alarm.hour);
            calendar.set(Calendar.MINUTE, alarm.minute);
            calendar.set(Calendar.SECOND, 0);
            calendar.set(Calendar.MILLISECOND, 0);
            if (calendar.getTimeInMillis() <= now) {
                calendar.add(Calendar.DAY_OF_MONTH, 1);
            }

            for (int attempt = 0; attempt < 8; attempt += 1) {
                int dayIndex = calendar.get(Calendar.DAY_OF_WEEK) - Calendar.SUNDAY;
                if (contains(alarm.days, dayIndex)) return calendar.getTimeInMillis();
                calendar.add(Calendar.DAY_OF_MONTH, 1);
            }
            return 0L;
        }

        return alarm.at > now ? alarm.at : 0L;
    }

    private static boolean contains(int[] values, int value) {
        if (values == null) return false;
        for (int item : values) if (item == value) return true;
        return false;
    }

    public static List<Alarm> parseAlarms(String json) throws JSONException {
        List<Alarm> alarms = new ArrayList<>();
        JSONArray array = new JSONArray(json == null ? "[]" : json);
        for (int index = 0; index < array.length(); index += 1) {
            JSONObject object = array.optJSONObject(index);
            if (object == null) continue;

            Alarm alarm = new Alarm();
            alarm.id = object.optString("id", "");
            if (alarm.id.isEmpty()) continue;
            alarm.hour = Math.max(0, Math.min(23, object.optInt("hour", 7)));
            alarm.minute = Math.max(0, Math.min(59, object.optInt("minute", 0)));
            alarm.label = object.optString("label", "").trim();
            if (alarm.label.length() > 32) alarm.label = alarm.label.substring(0, 32);
            alarm.enabled = object.optBoolean("enabled", true);
            alarm.at = object.optLong("at", 0L);
            alarm.sound = object.optString("sound", DEFAULT_SOUND);
            if (alarm.sound == null || alarm.sound.isEmpty()) alarm.sound = DEFAULT_SOUND;
            alarm.customSound = AlarmSoundStore.safeName(object.optString("customSound", ""));
            alarm.customSoundName = object.optString("customSoundName", "").trim();
            if (alarm.customSoundName.length() > 60) {
                alarm.customSoundName = alarm.customSoundName.substring(0, 60);
            }
            if (CUSTOM_SOUND.equals(alarm.sound) && alarm.customSound.isEmpty()) {
                alarm.sound = DEFAULT_SOUND;
            }
            if (!CUSTOM_SOUND.equals(alarm.sound) && !AlarmSoundStore.isBuiltInId(alarm.sound)) {
                alarm.sound = DEFAULT_SOUND;
            }

            JSONArray daysArray = object.optJSONArray("days");
            if (daysArray != null) {
                List<Integer> days = new ArrayList<>();
                for (int dayIndex = 0; dayIndex < daysArray.length(); dayIndex += 1) {
                    int day = daysArray.optInt(dayIndex, -1);
                    if (day >= 0 && day <= 6 && !days.contains(day)) days.add(day);
                }
                alarm.days = new int[days.size()];
                for (int dayIndex = 0; dayIndex < days.size(); dayIndex += 1) {
                    alarm.days[dayIndex] = days.get(dayIndex);
                }
            }
            alarm.once = alarm.days.length == 0;
            alarms.add(alarm);
        }
        return alarms;
    }

    private List<Alarm> readAlarmsLocked() {
        try {
            String raw = prefs().getString(KEY_ALARMS, "[]");
            return parseAlarms(raw);
        } catch (JSONException error) {
            return new ArrayList<>();
        }
    }

    private void writeAlarmsLocked(List<Alarm> alarms) {
        JSONArray array = new JSONArray();
        for (Alarm alarm : alarms) {
            try {
                JSONObject object = new JSONObject();
                object.put("id", alarm.id);
                object.put("hour", alarm.hour);
                object.put("minute", alarm.minute);
                object.put("label", alarm.label);
                object.put("enabled", alarm.enabled);
                object.put("once", alarm.once);
                object.put("at", alarm.at);
                object.put("sound", alarm.sound);
                object.put("customSound", alarm.customSound);
                object.put("customSoundName", alarm.customSoundName);
                JSONArray days = new JSONArray();
                for (int day : alarm.days) days.put(day);
                object.put("days", days);
                array.put(object);
            } catch (JSONException ignored) {
                // Skip malformed mirrors.
            }
        }
        prefs().edit().putString(KEY_ALARMS, array.toString()).apply();
    }

    private SharedPreferences prefs() {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }
}
