package com.shuman.clock;

import android.app.Activity;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Bundle;
import android.text.format.DateFormat;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/** Full-screen ringing screen shown over the lock screen. Audio lives in the service. */
public final class AlarmActivity extends Activity {

    private static final int BACKGROUND = Color.rgb(8, 8, 11);
    private static final int TEXT = Color.rgb(245, 241, 232);
    private static final int MUTED = Color.rgb(160, 155, 145);
    private static final int ACCENT = Color.rgb(233, 184, 114);

    private AlarmScheduler.Alarm alarm;
    private boolean alarmSnooze;
    private boolean stopReceiverRegistered;
    private String alarmId = "";
    private int alarmHour = 7;
    private int alarmMinute = 0;
    private String alarmLabel = "";
    private String alarmSound = AlarmScheduler.DEFAULT_SOUND;
    private String alarmCustomSound = "";
    private String alarmCustomSoundName = "";

    private final BroadcastReceiver ringingStopped = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            String stoppedId = intent == null
                    ? null : intent.getStringExtra(AlarmScheduler.EXTRA_ID);
            if (stoppedId == null || stoppedId.isEmpty() || stoppedId.equals(alarmId)) {
                finishAlarm();
            }
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
                | WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
                | WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD);
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarColor(Color.TRANSPARENT);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        }

        readIntent(getIntent());
        setContentView(buildContent());
        registerStopReceiver();
        ensureRinging();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        readIntent(intent);
        setContentView(buildContent());
        ensureRinging();
    }

    private void readIntent(Intent intent) {
        alarm = AlarmScheduler.fromIntent(intent);
        if (alarm == null) {
            alarm = new AlarmScheduler.Alarm();
        }
        alarmSnooze = intent != null
                && intent.getBooleanExtra(AlarmScheduler.EXTRA_SNOOZE, false);
        alarmId = alarm.id;
        alarmHour = alarm.hour;
        alarmMinute = alarm.minute;
        alarmLabel = alarm.label;
        alarmSound = alarm.sound;
        alarmCustomSound = alarm.customSound;
        alarmCustomSoundName = alarm.customSoundName;
    }

    private void registerStopReceiver() {
        IntentFilter filter = new IntentFilter(AlarmRingingService.ACTION_RINGING_STOPPED);
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                registerReceiver(ringingStopped, filter, Context.RECEIVER_NOT_EXPORTED);
            } else {
                registerReceiver(ringingStopped, filter);
            }
            stopReceiverRegistered = true;
        } catch (Exception ignored) {
            // Finishing on dismissal is a convenience; the buttons still work.
        }
    }

    /**
     * The receiver normally starts the service first. This covers a screen opened
     * directly (for example by tapping a fallback notification): because the
     * activity is in the foreground, the service is allowed to start and audio
     * begins without another tap.
     */
    private void ensureRinging() {
        if (alarmId.isEmpty() || AlarmRingingService.isRinging(alarmId)) return;
        try {
            AlarmRingingService.start(this, alarm, alarmSnooze);
        } catch (Exception error) {
            // Foreground-service start refused; ring the system alarm sound and
            // keep the full-screen-capable notification visible.
            AlarmNotifier.showFallback(this, alarm, alarmSnooze);
        }
    }

    private View buildContent() {
        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.setBackgroundColor(BACKGROUND);
        GradientDrawable background = new GradientDrawable(
                GradientDrawable.Orientation.TOP_BOTTOM,
                new int[]{Color.rgb(23, 19, 30), BACKGROUND, Color.rgb(12, 10, 16)});
        scroll.setBackground(background);

        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setGravity(Gravity.CENTER_HORIZONTAL);
        layout.setPadding(dp(26), dp(30), dp(26), dp(26));
        scroll.addView(layout, new ScrollView.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        TextView brand = new TextView(this);
        brand.setText("shuman");
        brand.setTextColor(ACCENT);
        brand.setTextSize(TypedValue.COMPLEX_UNIT_SP, 18);
        brand.setTypeface(Typeface.create("serif", Typeface.ITALIC));
        brand.setGravity(Gravity.CENTER);
        layout.addView(brand);

        TextView eyebrow = new TextView(this);
        eyebrow.setText("ALARM");
        eyebrow.setTextColor(MUTED);
        eyebrow.setTextSize(TypedValue.COMPLEX_UNIT_SP, 10);
        eyebrow.setLetterSpacing(0.3f);
        eyebrow.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams eyebrowParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        eyebrowParams.topMargin = dp(22);
        layout.addView(eyebrow, eyebrowParams);

        TextView time = new TextView(this);
        boolean is24 = DateFormat.is24HourFormat(this);
        int shownHour = alarmHour;
        String period = "";
        if (!is24) {
            period = alarmHour < 12 ? "AM" : "PM";
            shownHour = alarmHour % 12;
            if (shownHour == 0) shownHour = 12;
        }
        time.setText(String.format(Locale.getDefault(), "%02d:%02d", shownHour, alarmMinute));
        time.setTextColor(TEXT);
        time.setTextSize(TypedValue.COMPLEX_UNIT_SP, 78);
        time.setTypeface(Typeface.create("sans-serif-light", Typeface.NORMAL));
        time.setLetterSpacing(-0.02f);
        time.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams timeParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        timeParams.topMargin = dp(8);
        layout.addView(time, timeParams);

        if (!period.isEmpty()) {
            TextView periodView = new TextView(this);
            periodView.setText(period);
            periodView.setTextColor(MUTED);
            periodView.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11);
            periodView.setLetterSpacing(0.2f);
            periodView.setGravity(Gravity.CENTER);
            layout.addView(periodView);
        }

        TextView label = new TextView(this);
        label.setText(alarmLabel.trim().isEmpty()
                ? getString(R.string.alarm_default_label) : alarmLabel.trim());
        label.setTextColor(TEXT);
        label.setTextSize(TypedValue.COMPLEX_UNIT_SP, 23);
        label.setTypeface(Typeface.create("serif", Typeface.NORMAL));
        label.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams labelParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        labelParams.topMargin = dp(22);
        layout.addView(label, labelParams);

        TextView date = new TextView(this);
        date.setText(new SimpleDateFormat("EEEE, MMMM d", Locale.getDefault()).format(new Date()));
        date.setTextColor(MUTED);
        date.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
        date.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams dateParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        dateParams.topMargin = dp(8);
        layout.addView(date, dateParams);

        TextView music = new TextView(this);
        music.setText(("MUSIC · " + alarmSoundLabel()).toUpperCase(Locale.getDefault()));
        music.setTextColor(Color.argb(130, 233, 184, 114));
        music.setTextSize(TypedValue.COMPLEX_UNIT_SP, 9);
        music.setLetterSpacing(0.16f);
        music.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams musicParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        musicParams.topMargin = dp(12);
        layout.addView(music, musicParams);

        View spacer = new View(this);
        LinearLayout.LayoutParams spacerParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f);
        spacerParams.topMargin = dp(26);
        layout.addView(spacer, spacerParams);

        Button snooze = new Button(this);
        snooze.setText(getString(R.string.alarm_snooze, AlarmScheduler.SNOOZE_MINUTES));
        snooze.setTextColor(Color.rgb(23, 18, 8));
        snooze.setTextSize(TypedValue.COMPLEX_UNIT_SP, 15);
        snooze.setTypeface(Typeface.create("sans-serif-medium", Typeface.NORMAL));
        snooze.setAllCaps(false);
        snooze.setGravity(Gravity.CENTER);
        snooze.setBackground(rounded(ACCENT, 32, 0, 0));
        snooze.setOnClickListener(view -> snoozeAlarm());
        LinearLayout.LayoutParams snoozeParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dp(58));
        snoozeParams.topMargin = dp(10);
        layout.addView(snooze, snoozeParams);

        Button dismiss = new Button(this);
        dismiss.setText(R.string.alarm_dismiss);
        dismiss.setTextColor(TEXT);
        dismiss.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
        dismiss.setTypeface(Typeface.create("sans-serif-medium", Typeface.NORMAL));
        dismiss.setAllCaps(false);
        dismiss.setGravity(Gravity.CENTER);
        dismiss.setBackground(rounded(Color.TRANSPARENT, 32, dp(1), Color.argb(80, 255, 255, 255)));
        dismiss.setOnClickListener(view -> dismissAlarm());
        LinearLayout.LayoutParams dismissParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dp(54));
        dismissParams.topMargin = dp(10);
        layout.addView(dismiss, dismissParams);

        TextView foot = new TextView(this);
        foot.setText("shuman · time, in motion");
        foot.setTextColor(Color.argb(115, 245, 241, 232));
        foot.setTextSize(TypedValue.COMPLEX_UNIT_SP, 9);
        foot.setLetterSpacing(0.14f);
        foot.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams footParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        footParams.topMargin = dp(24);
        layout.addView(foot, footParams);

        return scroll;
    }

    private GradientDrawable rounded(int color, int radiusDp, int strokeDp, int strokeColor) {
        GradientDrawable drawable = new GradientDrawable();
        drawable.setShape(GradientDrawable.RECTANGLE);
        drawable.setColor(color);
        drawable.setCornerRadius(dp(radiusDp));
        if (strokeDp > 0) drawable.setStroke(strokeDp, strokeColor);
        return drawable;
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private String alarmSoundLabel() {
        if (AlarmScheduler.CUSTOM_SOUND.equals(alarmSound)) {
            return alarmCustomSoundName.trim().isEmpty()
                    ? "Custom music" : alarmCustomSoundName.trim();
        }
        if (!AlarmSoundStore.isBuiltInId(alarmSound)) return "Golden Chime";

        StringBuilder label = new StringBuilder();
        for (String part : alarmSound.split("-")) {
            if (part.isEmpty()) continue;
            if (label.length() > 0) label.append(' ');
            label.append(Character.toUpperCase(part.charAt(0))).append(part.substring(1));
        }
        return label.length() == 0 ? "Golden Chime" : label.toString();
    }

    private void snoozeAlarm() {
        AlarmRingingService.snooze(this, alarm);
        finishAlarm();
    }

    private void dismissAlarm() {
        AlarmRingingService.dismiss(this, alarmId);
        finishAlarm();
    }

    private void finishAlarm() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            finishAndRemoveTask();
        } else {
            finish();
        }
    }

    @Override
    public void onBackPressed() {
        snoozeAlarm();
    }

    @Override
    protected void onDestroy() {
        if (stopReceiverRegistered) {
            try {
                unregisterReceiver(ringingStopped);
            } catch (Exception ignored) {
                // Already unregistered.
            }
            stopReceiverRegistered = false;
        }
        super.onDestroy();
    }
}
