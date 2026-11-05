package com.shuman.clock;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.NotificationManager;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.OpenableColumns;
import android.provider.Settings;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import androidx.annotation.NonNull;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import androidx.webkit.WebViewAssetLoader;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.Locale;

public class MainActivity extends Activity {

    private static final String APP_URL = "https://appassets.androidplatform.net/assets/www/index.html";
    private static final String APP_HOST = "appassets.androidplatform.net";
    private static final int DARK_BACKGROUND = Color.rgb(8, 8, 11);
    private static final int LIGHT_BACKGROUND = Color.rgb(242, 237, 227);
    private static final String STATE_THEME = "shuman.darkTheme";
    private static final int REQUEST_NOTIFICATIONS = 4701;
    private static final int REQUEST_ALARM_SOUND = 4702;
    private static final long MAX_SOUND_BYTES = 30L * 1024L * 1024L;
    private static final String AUDIO_EXTENSIONS = "mp3,m4a,aac,ogg,oga,opus,wav,flac,mid,midi,3gp,amr";

    private WebView webView;
    private FrameLayout root;
    private boolean darkTheme = true;
    private boolean pendingAlarmView = false;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarColor(Color.TRANSPARENT);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            getWindow().setStatusBarContrastEnforced(false);
            getWindow().setNavigationBarContrastEnforced(false);
        }

        root = new FrameLayout(this);
        root.setBackgroundColor(DARK_BACKGROUND);

        webView = new WebView(this);
        webView.setBackgroundColor(DARK_BACKGROUND);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        webView.setLayoutParams(new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT));

        root.addView(webView);
        setContentView(root);

        applyRootInsets();
        configureWebView();
        AlarmNotifier.ensureChannel(this);
        handleIntent(getIntent());

        if (savedInstanceState != null) {
            darkTheme = savedInstanceState.getBoolean(STATE_THEME, true);
            applyTheme(darkTheme);
            webView.restoreState(savedInstanceState);
            if (webView.getUrl() == null) {
                webView.loadUrl(APP_URL);
            }
        } else {
            applyTheme(true);
            webView.loadUrl(APP_URL);
        }
    }

    private void applyRootInsets() {
        ViewCompat.setOnApplyWindowInsetsListener(root, (view, windowInsets) -> {
            Insets bars = windowInsets.getInsets(
                    WindowInsetsCompat.Type.systemBars()
                            | WindowInsetsCompat.Type.displayCutout());
            Insets ime = windowInsets.getInsets(WindowInsetsCompat.Type.ime());
            view.setPadding(bars.left, bars.top, bars.right, Math.max(bars.bottom, ime.bottom));
            return windowInsets;
        });
        ViewCompat.requestApplyInsets(root);
    }

    private void configureWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        final WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .addPathHandler("/custom-sounds/", new WebViewAssetLoader.InternalStoragePathHandler(
                        this, AlarmSoundStore.directory(this)))
                .build();

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (APP_HOST.equals(uri.getHost())) {
                    return false;
                }
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, uri));
                } catch (Exception ignored) {
                    // No app can handle this link; keep the current page.
                }
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                pushPermissionRefresh();
                if (pendingAlarmView) {
                    pendingAlarmView = false;
                    view.evaluateJavascript(
                            "window.shuman && window.shuman.openAlarmView();", null);
                }
            }
        });

        webView.addJavascriptInterface(new AppBridge(), "ShumanAndroid");
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
    }

    private void applyTheme(boolean dark) {
        darkTheme = dark;
        int background = dark ? DARK_BACKGROUND : LIGHT_BACKGROUND;

        root.setBackgroundColor(background);
        webView.setBackgroundColor(background);
        getWindow().setBackgroundDrawable(new ColorDrawable(background));

        WindowInsetsControllerCompat controller =
                WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        controller.setAppearanceLightStatusBars(!dark);
        controller.setAppearanceLightNavigationBars(!dark);
    }

    private void handleIntent(Intent intent) {
        if (intent != null && intent.getBooleanExtra("open_alarm", false)) {
            pendingAlarmView = true;
        }
    }

    private boolean notificationsGranted() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return true;
        return checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
                == PackageManager.PERMISSION_GRANTED;
    }

    private boolean fullScreenGranted() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) return true;
        NotificationManager manager =
                (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        return manager == null || manager.canUseFullScreenIntent();
    }

    private void pushPermissionRefresh() {
        if (webView == null) return;
        webView.evaluateJavascript(
                "window.dispatchEvent(new Event('shuman:permissions'));", null);
    }

    private final class AppBridge {
        @JavascriptInterface
        public void setTheme(String theme) {
            boolean dark = !"light".equals(theme);
            runOnUiThread(() -> applyTheme(dark));
        }

        @JavascriptInterface
        public void syncAlarms(String json) {
            new AlarmScheduler(MainActivity.this).sync(json);
        }

        @JavascriptInterface
        public String consumeAlarmEvents() {
            return new AlarmScheduler(MainActivity.this).consumeEvents();
        }

        @JavascriptInterface
        public String alarmPermissionStatus() {
            try {
                JSONObject status = new JSONObject();
                status.put("notifications", notificationsGranted());
                status.put("exact", AlarmScheduler.canScheduleExact(MainActivity.this));
                status.put("fullscreen", fullScreenGranted());
                status.put("sdk", Build.VERSION.SDK_INT);
                return status.toString();
            } catch (Exception error) {
                return "{}";
            }
        }

        @JavascriptInterface
        public void requestAlarmPermissions() {
            runOnUiThread(MainActivity.this::requestNextAlarmPermission);
        }

        @JavascriptInterface
        public void pickAlarmSound() {
            runOnUiThread(MainActivity.this::openAlarmSoundPicker);
        }
    }

    private void openAlarmSoundPicker() {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("audio/*");
        try {
            startActivityForResult(intent, REQUEST_ALARM_SOUND);
        } catch (Exception error) {
            sendCustomSoundResult(
                    false, null, null, "No audio file picker is available on this device.");
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != REQUEST_ALARM_SOUND) return;

        if (resultCode != RESULT_OK || data == null || data.getData() == null) {
            if (webView != null) {
                webView.evaluateJavascript(
                        "window.shumanCustomSoundCancelled && window.shumanCustomSoundCancelled();",
                        null);
            }
            return;
        }
        importAlarmSound(data.getData());
    }

    private void importAlarmSound(Uri uri) {
        final Uri source = uri;

        // Some document providers stream from the cloud; never block the UI thread.
        new Thread(() -> {
            File temp = null;
            InputStream input = null;
            OutputStream output = null;
            String failure = null;
            String storedName = "";
            String callbackName = "Custom music";
            try {
                String displayName = readDisplayName(source);
                if (displayName.isEmpty()) displayName = "Custom music";
                String extension = pickAudioExtension(
                        displayName, getContentResolver().getType(source));
                storedName = "custom-" + System.currentTimeMillis() + "-"
                        + Integer.toHexString((int) (System.nanoTime() & 0xFFFFFF))
                        + "." + extension;
                callbackName = displayName.length() > 60
                        ? displayName.substring(0, 60) : displayName;

                File directory = AlarmSoundStore.directory(getApplicationContext());
                temp = new File(directory, storedName + ".part");
                input = getContentResolver().openInputStream(source);
                if (input == null) throw new IOException("That audio file could not be opened.");
                output = new FileOutputStream(temp);

                byte[] buffer = new byte[64 * 1024];
                long total = 0L;
                int read;
                while ((read = input.read(buffer)) != -1) {
                    total += read;
                    if (total > MAX_SOUND_BYTES) {
                        throw new IOException("Custom music must be smaller than 30 MB.");
                    }
                    output.write(buffer, 0, read);
                }
                output.flush();
                output.close();
                output = null;
                input.close();
                input = null;

                if (total <= 0L) throw new IOException("That audio file is empty.");
                File target = new File(directory, storedName);
                if (!temp.renameTo(target)) {
                    throw new IOException("The audio file could not be saved.");
                }
                temp = null;
            } catch (Exception error) {
                failure = error.getMessage();
                if (failure == null || failure.trim().isEmpty()) {
                    failure = "That audio file could not be imported.";
                }
            } finally {
                closeQuietly(input);
                closeQuietly(output);
                if (temp != null && temp.exists()) {
                    //noinspection ResultOfMethodCallIgnored
                    temp.delete();
                }
            }

            final String errorMessage = failure;
            final String resultFile = storedName;
            final String resultName = callbackName;
            runOnUiThread(() -> {
                if (errorMessage == null) {
                    sendCustomSoundResult(true, resultFile, resultName, null);
                } else {
                    sendCustomSoundResult(false, null, null, errorMessage);
                }
            });
        }, "shuman-sound-import").start();
    }

    private String readDisplayName(Uri uri) {
        Cursor cursor = null;
        try {
            cursor = getContentResolver().query(
                    uri, new String[]{OpenableColumns.DISPLAY_NAME}, null, null, null);
            if (cursor != null && cursor.moveToFirst()) {
                int index = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                if (index >= 0) {
                    String name = cursor.getString(index);
                    if (name != null && !name.trim().isEmpty()) return name.trim();
                }
            }
        } catch (Exception ignored) {
            // Fall back to the URI's last segment.
        } finally {
            if (cursor != null) cursor.close();
        }
        String fallback = uri.getLastPathSegment();
        return fallback == null ? "" : fallback;
    }

    private String pickAudioExtension(String displayName, String mime) {
        String lower = displayName.toLowerCase(Locale.US);
        int dot = lower.lastIndexOf('.');
        if (dot >= 0 && dot < lower.length() - 1) {
            String candidate = lower.substring(dot + 1);
            if (("," + AUDIO_EXTENSIONS + ",").contains("," + candidate + ",")) {
                return candidate;
            }
        }
        if (mime != null) {
            switch (mime.toLowerCase(Locale.US)) {
                case "audio/mpeg":
                    return "mp3";
                case "audio/mp4":
                case "audio/x-m4a":
                case "audio/m4a":
                    return "m4a";
                case "audio/aac":
                case "audio/x-aac":
                    return "aac";
                case "audio/ogg":
                    return "ogg";
                case "audio/opus":
                    return "opus";
                case "audio/wav":
                case "audio/x-wav":
                case "audio/wave":
                    return "wav";
                case "audio/flac":
                case "audio/x-flac":
                    return "flac";
                case "audio/midi":
                case "audio/x-midi":
                    return "mid";
                case "audio/3gpp":
                    return "3gp";
                case "audio/amr":
                    return "amr";
                default:
                    break;
            }
        }
        return "mp3";
    }

    private void sendCustomSoundResult(boolean ok, String file, String name, String error) {
        if (webView == null) return;
        try {
            JSONObject result = new JSONObject();
            result.put("ok", ok);
            if (file != null) result.put("file", file);
            if (name != null) result.put("name", name);
            if (error != null) result.put("error", error);
            String script = "window.shumanCustomSound && window.shumanCustomSound("
                    + JSONObject.quote(result.toString()) + ");";
            webView.evaluateJavascript(script, null);
        } catch (JSONException ignored) {
            // The proxy is advisory; the web app keeps its current selection.
        }
    }

    private void closeQuietly(InputStream stream) {
        if (stream == null) return;
        try {
            stream.close();
        } catch (IOException ignored) {
            // Already closed.
        }
    }

    private void closeQuietly(OutputStream stream) {
        if (stream == null) return;
        try {
            stream.close();
        } catch (IOException ignored) {
            // Already closed.
        }
    }

    private void requestNextAlarmPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && !notificationsGranted()) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, REQUEST_NOTIFICATIONS);
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !AlarmScheduler.canScheduleExact(this)) {
            try {
                Intent intent = new Intent(
                        Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,
                        Uri.parse("package:" + getPackageName()));
                startActivity(intent);
            } catch (Exception ignored) {
                // Some OEMs do not expose this screen.
            }
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE && !fullScreenGranted()) {
            try {
                Intent intent = new Intent(
                        Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT,
                        Uri.parse("package:" + getPackageName()));
                startActivity(intent);
            } catch (Exception ignored) {
                // Not available on this device.
            }
            return;
        }

        pushPermissionRefresh();
    }

    @Override
    public void onRequestPermissionsResult(
            int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQUEST_NOTIFICATIONS) pushPermissionRefresh();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIntent(intent);
        if (pendingAlarmView && webView != null) {
            pendingAlarmView = false;
            webView.evaluateJavascript("window.shuman && window.shuman.openAlarmView();", null);
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        pushPermissionRefresh();
        if (webView != null) {
            webView.evaluateJavascript(
                    "window.shuman && window.shuman.refreshAlarms();", null);
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onSaveInstanceState(@NonNull Bundle outState) {
        if (webView != null) {
            webView.saveState(outState);
        }
        outState.putBoolean(STATE_THEME, darkTheme);
        super.onSaveInstanceState(outState);
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            root.removeView(webView);
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
