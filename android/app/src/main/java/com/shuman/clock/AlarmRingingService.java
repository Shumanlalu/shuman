package com.shuman.clock;

import android.app.Notification;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.content.res.AssetFileDescriptor;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.os.VibrationEffect;
import android.os.VibrationAttributes;
import android.os.Vibrator;
import android.os.VibratorManager;
import android.util.Log;

import androidx.core.app.NotificationManagerCompat;
import androidx.core.app.ServiceCompat;
import androidx.core.content.ContextCompat;

import java.io.File;
import java.io.IOException;

/**
 * Owns alarm playback. It is started as a foreground service the moment the
 * AlarmReceiver fires, so music and vibration begin even if Android blocks the
 * full-screen activity or the user never touches the notification.
 */
public final class AlarmRingingService extends Service {

    public static final String ACTION_START = "com.shuman.clock.ACTION_START_RINGING";
    public static final String ACTION_RINGING_STOPPED = "com.shuman.clock.ACTION_RINGING_STOPPED";
    private static final String TAG = "ShumanAlarmService";

    private static volatile String ringingId = "";

    private MediaPlayer player;
    private AssetFileDescriptor assetSound;
    private Vibrator vibrator;
    private AudioManager audioManager;
    private AudioFocusRequest focusRequest;
    private AlarmScheduler.Alarm alarm;
    private boolean snoozed;
    private boolean foregroundStarted;

    /** Starts playback. Callers must be ready to handle a service-start failure. */
    public static void start(Context context, AlarmScheduler.Alarm alarm, boolean snooze) {
        if (context == null || alarm == null || alarm.id == null || alarm.id.isEmpty()) return;
        Intent intent = new Intent(context, AlarmRingingService.class);
        intent.setAction(ACTION_START);
        AlarmScheduler.putExtras(intent, alarm, snooze);
        ContextCompat.startForegroundService(context, intent);
    }

    /** True while this process is ringing the given alarm. */
    public static boolean isRinging(String id) {
        return id != null && !id.isEmpty() && id.equals(ringingId);
    }

    public static void snooze(Context context, AlarmScheduler.Alarm alarm) {
        if (context == null) return;
        if (alarm != null && alarm.id != null && !alarm.id.isEmpty()) {
            new AlarmScheduler(context).scheduleSnooze(alarm);
            AlarmNotifier.cancel(context, alarm.id);
        }
        stop(context);
    }

    public static void dismiss(Context context, String id) {
        if (context == null) return;
        if (id != null && !id.isEmpty()) {
            new AlarmScheduler(context).markDismissed(id);
            AlarmNotifier.cancel(context, id);
        }
        stop(context);
    }

    public static void stop(Context context) {
        if (context == null) return;
        try {
            context.stopService(new Intent(context, AlarmRingingService.class));
        } catch (Exception ignored) {
            // The service is already gone.
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null || !ACTION_START.equals(intent.getAction())) {
            stopSelf();
            return START_NOT_STICKY;
        }

        AlarmScheduler.Alarm incoming = AlarmScheduler.fromIntent(intent);
        if (incoming == null) {
            stopSelf();
            return START_NOT_STICKY;
        }

        String previousId = alarm == null ? "" : alarm.id;
        boolean alreadyRinging = player != null && incoming.id.equals(previousId);

        if (!previousId.isEmpty() && !previousId.equals(incoming.id)) {
            AlarmNotifier.cancel(this, previousId);
        }

        alarm = incoming;
        snoozed = intent.getBooleanExtra(AlarmScheduler.EXTRA_SNOOZE, false);

        if (!enterForeground()) return START_NOT_STICKY;

        if (alreadyRinging) {
            // A duplicate start (for example, the activity opening defensively)
            // must not restart the music from the beginning.
            return START_REDELIVER_INTENT;
        }

        startPlayback();
        try {
            startActivity(AlarmNotifier.alarmActivityIntent(this, alarm, snoozed));
        } catch (Exception ignored) {
            // Android usually blocks background activity starts; the notification
            // full-screen intent is the supported route.
        }
        return START_REDELIVER_INTENT;
    }

    private boolean enterForeground() {
        try {
            // A notification left over from a previous session or app version can
            // suppress alerting via setOnlyAlertOnce(); clear it first so every
            // fresh ring posts a brand-new notification and launches its
            // full-screen intent immediately.
            if (!foregroundStarted) {
                try {
                    NotificationManagerCompat.from(this)
                            .cancel(AlarmScheduler.notificationId(alarm.id));
                } catch (Exception ignored) {
                    // Nothing to clear.
                }
            }

            Notification notification =
                    AlarmNotifier.buildRingingNotification(this, alarm, snoozed);
            int type = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
                    ? ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK
                    : 0;
            ServiceCompat.startForeground(
                    this, AlarmScheduler.notificationId(alarm.id), notification, type);
            foregroundStarted = true;
            ringingId = alarm == null ? "" : alarm.id;
            return true;
        } catch (Exception error) {
            Log.e(TAG, "Unable to start the alarm foreground service", error);
            AlarmNotifier.showFallback(this, alarm, snoozed);
            stopSelf();
            return false;
        }
    }

    private void startPlayback() {
        stopPlayback();
        requestAudioFocus();

        if (!playAlarmSound()) {
            Log.w(TAG, "No playable alarm audio; relying on the ringing screen");
        }

        try {
            vibrator = vibrator();
            if (vibrator != null && vibrator.hasVibrator()) {
                long[] pattern = {0, 650, 450, 650, 900};
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    VibrationEffect effect = VibrationEffect.createWaveform(pattern, 0);
                    vibrator.vibrate(effect, VibrationAttributes.createForUsage(
                            VibrationAttributes.USAGE_ALARM));
                } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0));
                } else {
                    vibrator.vibrate(pattern, 0);
                }
            }
        } catch (Exception ignored) {
            // Vibration is optional.
        }
    }

    private Vibrator vibrator() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            VibratorManager manager =
                    (VibratorManager) getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
            return manager == null ? null : manager.getDefaultVibrator();
        }
        return (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
    }

    private AudioAttributes alarmAttributes() {
        return new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                .build();
    }

    private void requestAudioFocus() {
        audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        if (audioManager == null) return;
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                focusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
                        .setAudioAttributes(alarmAttributes())
                        .setWillPauseWhenDucked(false)
                        .setOnAudioFocusChangeListener(change -> {
                            // Alarms keep ringing even if another app takes focus.
                        })
                        .build();
                audioManager.requestAudioFocus(focusRequest);
            } else {
                //noinspection deprecation
                audioManager.requestAudioFocus(
                        null, AudioManager.STREAM_ALARM, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT);
            }
        } catch (Exception ignored) {
            // Playback is more important than focus bookkeeping.
        }
    }

    private void abandonAudioFocus() {
        if (audioManager == null) return;
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && focusRequest != null) {
                audioManager.abandonAudioFocusRequest(focusRequest);
            } else {
                //noinspection deprecation
                audioManager.abandonAudioFocus(null);
            }
        } catch (Exception ignored) {
            // Already released.
        }
        focusRequest = null;
        audioManager = null;
    }

    private boolean playAlarmSound() {
        if (alarm == null) return false;

        if (AlarmScheduler.CUSTOM_SOUND.equals(alarm.sound)) {
            if (!alarm.customSound.isEmpty() && playCustomSound(alarm.customSound)) {
                return true;
            }
            if (playBuiltInSound(AlarmScheduler.DEFAULT_SOUND)) return true;
        } else {
            if (playBuiltInSound(alarm.sound)) return true;
            if (!AlarmScheduler.DEFAULT_SOUND.equals(alarm.sound)
                    && playBuiltInSound(AlarmScheduler.DEFAULT_SOUND)) {
                return true;
            }
        }
        return playSystemAlarm();
    }

    private boolean playCustomSound(String name) {
        File file = AlarmSoundStore.customFile(this, name);
        if (file == null || !file.isFile()) return false;

        MediaPlayer next = null;
        try {
            next = new MediaPlayer();
            preparePlayer(next);
            next.setDataSource(file.getAbsolutePath());
            next.prepare();
            next.start();
            player = next;
            return true;
        } catch (Exception error) {
            release(next);
            return false;
        }
    }

    private boolean playBuiltInSound(String id) {
        if (!AlarmSoundStore.isBuiltInId(id)) id = AlarmScheduler.DEFAULT_SOUND;
        AssetFileDescriptor descriptor = null;
        MediaPlayer next = null;
        try {
            descriptor = getAssets().openFd("www/alarm-sounds/" + id + ".wav");
            next = new MediaPlayer();
            preparePlayer(next);
            next.setDataSource(
                    descriptor.getFileDescriptor(),
                    descriptor.getStartOffset(),
                    descriptor.getLength());
            next.prepare();
            next.start();
            player = next;
            assetSound = descriptor;
            return true;
        } catch (Exception error) {
            closeAssetSound(descriptor);
            release(next);
            return false;
        }
    }

    private boolean playSystemAlarm() {
        Uri sound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
        if (sound == null) sound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
        if (sound == null) sound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
        if (sound == null) return false;

        MediaPlayer next = null;
        try {
            next = new MediaPlayer();
            preparePlayer(next);
            next.setDataSource(this, sound);
            next.prepare();
            next.start();
            player = next;
            return true;
        } catch (Exception error) {
            release(next);
            return false;
        }
    }

    private void preparePlayer(MediaPlayer target) {
        target.setAudioAttributes(alarmAttributes());
        target.setLooping(true);
        target.setWakeMode(this, PowerManager.PARTIAL_WAKE_LOCK);
    }

    private void stopPlayback() {
        if (player != null) {
            try {
                player.stop();
            } catch (Exception ignored) {
                // Already stopped.
            }
            release(player);
            player = null;
        }
        closeAssetSound(assetSound);
        assetSound = null;

        if (vibrator != null) {
            try {
                vibrator.cancel();
            } catch (Exception ignored) {
                // No active vibration.
            }
            vibrator = null;
        }
        abandonAudioFocus();
    }

    private void release(MediaPlayer target) {
        if (target == null) return;
        try {
            target.release();
        } catch (Exception ignored) {
            // Already released.
        }
    }

    private void closeAssetSound(AssetFileDescriptor descriptor) {
        if (descriptor == null) return;
        try {
            descriptor.close();
        } catch (IOException ignored) {
            // Already closed.
        }
    }

    @Override
    public void onDestroy() {
        stopPlayback();
        if (foregroundStarted) {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                    stopForeground(STOP_FOREGROUND_REMOVE);
                } else {
                    stopForeground(true);
                }
            } catch (Exception ignored) {
                // The notification is already gone.
            }
        }
        // Do not cancel a fallback notification posted after a failed
        // startForeground(); that notification is the remaining alarm UI.
        if (foregroundStarted && alarm != null && alarm.id != null && !alarm.id.isEmpty()) {
            AlarmNotifier.cancel(this, alarm.id);
        }
        ringingId = "";

        Intent stopped = new Intent(ACTION_RINGING_STOPPED);
        stopped.setPackage(getPackageName());
        if (alarm != null) {
            stopped.putExtra(AlarmScheduler.EXTRA_ID, alarm.id);
        }
        try {
            sendBroadcast(stopped);
        } catch (Exception ignored) {
            // No ringing screen is listening.
        }

        super.onDestroy();
    }
}
