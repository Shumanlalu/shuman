package com.shuman.clock;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import java.util.Locale;

/** Builds the alarm notification and its full-screen alarm intent. */
public final class AlarmNotifier {

    private static final String CHANNEL_ID = "shuman_alarms_v2";
    private static final String FALLBACK_CHANNEL_ID = "shuman_alarms_fallback_v1";
    private static final String LEGACY_CHANNEL_ID = "shuman_alarms";

    private AlarmNotifier() {}

    public static void ensureChannel(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager =
                (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) return;

        // Older versions let the channel itself ring a system tone. The ringing
        // service now plays the per-alarm music, so the primary channel is silent
        // but still uses high importance so full-screen and heads-up alerts work.
        if (manager.getNotificationChannel(LEGACY_CHANNEL_ID) != null) {
            manager.deleteNotificationChannel(LEGACY_CHANNEL_ID);
        }

        NotificationChannel channel = manager.getNotificationChannel(CHANNEL_ID);
        if (channel == null) {
            channel = new NotificationChannel(
                    CHANNEL_ID,
                    context.getString(R.string.alarm_channel_name),
                    NotificationManager.IMPORTANCE_HIGH);
            channel.setDescription(context.getString(R.string.alarm_channel_description));
            channel.enableVibration(false);
            channel.setSound(null, null);
            channel.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);
            manager.createNotificationChannel(channel);
        }

        // Only used when Android refuses to start the ringing service. It rings
        // the device's own alarm sound as a last-resort audible notification.
        NotificationChannel fallback = manager.getNotificationChannel(FALLBACK_CHANNEL_ID);
        if (fallback == null) {
            fallback = new NotificationChannel(
                    FALLBACK_CHANNEL_ID,
                    context.getString(R.string.alarm_channel_fallback_name),
                    NotificationManager.IMPORTANCE_HIGH);
            fallback.setDescription(context.getString(R.string.alarm_channel_fallback_description));
            fallback.enableVibration(false);
            Uri alarmSound = defaultAlarmSound();
            if (alarmSound != null) {
                AudioAttributes attributes = new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build();
                fallback.setSound(alarmSound, attributes);
            }
            fallback.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);
            manager.createNotificationChannel(fallback);
        }
    }

    /** The silent, high-importance notification that the ringing service displays. */
    public static Notification buildRingingNotification(
            Context context, AlarmScheduler.Alarm alarm, boolean snooze) {
        ensureChannel(context);
        PendingIntent fullScreenIntent = activityPendingIntent(context, alarm, snooze);

        return baseBuilder(context, CHANNEL_ID, alarm, snooze, fullScreenIntent)
                .setSound(null)
                .setSilent(true)
                // Show the notification and launch its full-screen intent right away
                // instead of waiting for Android's foreground-service grace period.
                .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
                .build();
    }

    /** Audible notification used only if the foreground ringing service cannot start. */
    public static void showFallback(
            Context context, AlarmScheduler.Alarm alarm, boolean snooze) {
        if (context == null || alarm == null || alarm.id == null || alarm.id.isEmpty()) return;

        ensureChannel(context);
        PendingIntent contentIntent = activityPendingIntent(context, alarm, snooze);
        Uri sound = defaultAlarmSound();

        NotificationCompat.Builder builder =
                baseBuilder(context, FALLBACK_CHANNEL_ID, alarm, snooze, contentIntent)
                        .setSound(sound)
                        .setDefaults(NotificationCompat.DEFAULT_VIBRATE);

        try {
            NotificationManagerCompat.from(context).notify(
                    AlarmScheduler.notificationId(alarm.id), builder.build());
        } catch (SecurityException ignored) {
            // Notification permission may be unavailable.
        }

        // The screen is only a fallback here. If it opens, it will try to start
        // the foreground service again from the foreground.
        try {
            context.startActivity(alarmActivityIntent(context, alarm, snooze));
        } catch (Exception ignored) {
            // Background activity starts may be blocked; the notification remains.
        }
    }

    public static Intent alarmActivityIntent(
            Context context, AlarmScheduler.Alarm alarm, boolean snooze) {
        Intent intent = new Intent(context, AlarmActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK
                | Intent.FLAG_ACTIVITY_CLEAR_TOP
                | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        AlarmScheduler.putExtras(intent, alarm, snooze);
        return intent;
    }

    private static PendingIntent activityPendingIntent(
            Context context, AlarmScheduler.Alarm alarm, boolean snooze) {
        return PendingIntent.getActivity(
                context,
                AlarmScheduler.requestCode(alarm.id),
                alarmActivityIntent(context, alarm, snooze),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static NotificationCompat.Builder baseBuilder(
            Context context,
            String channelId,
            AlarmScheduler.Alarm alarm,
            boolean snooze,
            PendingIntent contentIntent) {
        String label = alarm.label == null || alarm.label.trim().isEmpty()
                ? context.getString(R.string.alarm_default_label)
                : alarm.label.trim();
        String time = String.format(Locale.getDefault(), "%02d:%02d", alarm.hour, alarm.minute);

        return new NotificationCompat.Builder(context, channelId)
                .setSmallIcon(R.drawable.ic_stat_alarm)
                .setContentTitle(label)
                .setContentText(time + (snooze ? " · snoozed" : ""))
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setOngoing(true)
                .setAutoCancel(false)
                .setOnlyAlertOnce(true)
                .setWhen(System.currentTimeMillis())
                .setShowWhen(true)
                .setContentIntent(contentIntent)
                .setFullScreenIntent(contentIntent, true)
                .addAction(
                        R.drawable.ic_stat_alarm,
                        context.getString(R.string.alarm_snooze, AlarmScheduler.SNOOZE_MINUTES),
                        snoozeAction(context, alarm))
                .addAction(
                        android.R.drawable.ic_menu_close_clear_cancel,
                        context.getString(R.string.alarm_dismiss),
                        dismissAction(context, alarm));
    }

    private static PendingIntent snoozeAction(Context context, AlarmScheduler.Alarm alarm) {
        Intent intent = new Intent(context, AlarmReceiver.class);
        intent.setAction(AlarmReceiver.ACTION_SNOOZE);
        AlarmScheduler.putExtras(intent, alarm, true);
        return PendingIntent.getBroadcast(
                context,
                snoozeRequestCode(alarm.id),
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static PendingIntent dismissAction(Context context, AlarmScheduler.Alarm alarm) {
        Intent intent = new Intent(context, AlarmReceiver.class);
        intent.setAction(AlarmReceiver.ACTION_DISMISS);
        intent.putExtra(AlarmScheduler.EXTRA_ID, alarm.id);
        return PendingIntent.getBroadcast(
                context,
                dismissRequestCode(alarm.id),
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static int snoozeRequestCode(String id) {
        return (AlarmScheduler.requestCode(id) ^ 0x51A0) & 0x0FFFFFFF;
    }

    private static int dismissRequestCode(String id) {
        return (AlarmScheduler.requestCode(id) ^ 0x51D0) & 0x0FFFFFFF;
    }

    private static Uri defaultAlarmSound() {
        Uri sound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
        if (sound == null) sound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
        if (sound == null) sound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
        return sound;
    }

    public static void cancel(Context context, String id) {
        if (context == null || id == null || id.isEmpty()) return;
        NotificationManagerCompat.from(context).cancel(AlarmScheduler.notificationId(id));
    }
}
