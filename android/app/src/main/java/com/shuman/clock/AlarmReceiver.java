package com.shuman.clock;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Receives scheduled alarms and notification actions, then starts or stops ringing. */
public final class AlarmReceiver extends BroadcastReceiver {

    public static final String ACTION_SNOOZE = "com.shuman.clock.ACTION_SNOOZE";
    public static final String ACTION_DISMISS = "com.shuman.clock.ACTION_DISMISS";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;

        String action = intent.getAction();
        if (ACTION_SNOOZE.equals(action)) {
            AlarmRingingService.snooze(context, AlarmScheduler.fromIntent(intent));
            return;
        }
        if (ACTION_DISMISS.equals(action)) {
            AlarmRingingService.dismiss(context, intent.getStringExtra(AlarmScheduler.EXTRA_ID));
            return;
        }
        if (!AlarmScheduler.ACTION_FIRE.equals(action)) return;

        String id = intent.getStringExtra(AlarmScheduler.EXTRA_ID);
        if (id == null || id.isEmpty()) return;

        AlarmScheduler scheduler = new AlarmScheduler(context);
        AlarmScheduler.Alarm alarm = scheduler.findById(id);
        if (alarm == null) return;

        boolean snooze = intent.getBooleanExtra(AlarmScheduler.EXTRA_SNOOZE, false);
        if (!snooze) {
            if (!alarm.enabled) return;
            // Repeating alarms keep their next occurrence ready immediately.
            if (alarm.days != null && alarm.days.length > 0) {
                scheduler.schedule(alarm);
            }
        }

        try {
            AlarmRingingService.start(context, alarm, snooze);
        } catch (Exception error) {
            // Android 12+ can refuse a foreground-service start from the background.
            // Keep an audible, full-screen-capable notification as a last resort.
            AlarmNotifier.showFallback(context, alarm, snooze);
        }
    }
}
