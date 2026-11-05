package com.shuman.clock;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Restores alarms after reboot, app updates and clock changes. */
public final class BootReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || intent.getAction() == null) return;
        String action = intent.getAction();
        if (Intent.ACTION_BOOT_COMPLETED.equals(action)
                || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)
                || Intent.ACTION_TIME_CHANGED.equals(action)
                || Intent.ACTION_TIMEZONE_CHANGED.equals(action)) {
            AlarmNotifier.ensureChannel(context);
            new AlarmScheduler(context).rescheduleAll();
        }
    }
}
