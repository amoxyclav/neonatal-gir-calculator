package com.neonatalgir.calculator;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.net.Uri;
import org.json.JSONObject;
import android.content.res.ColorStateList;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;

public class MainActivity extends Activity {
    private static final String HOME_URL = "file:///android_asset/site/index.html#home";
    private static final int BLUE = Color.rgb(37, 99, 235);
    private static final int MUTED = Color.rgb(113, 128, 150);
    private static final int ACTIVE_BG = Color.rgb(232, 241, 255);
    private static final int REQUEST_PROFILE_EXPORT = 701;
    private static final int REQUEST_PROFILE_IMPORT = 702;
    private WebView webView;
    private LinearLayout bottomNavigation;
    private boolean exitDialogVisible = false;
    private boolean backActionPending = false;
    private boolean resetHistoryAfterHomeLoad = false;
    private String selectedPage = "home";
    private String pendingProfileBackup;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.WHITE);
        getWindow().setNavigationBarColor(Color.WHITE);
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR
        );

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        GradientDrawable appBackground = new GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM, new int[]{Color.rgb(247, 250, 255), Color.rgb(239, 244, 253), Color.rgb(244, 242, 255)});
        root.setBackground(appBackground);

        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(242, 246, 253));
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        webView.setVerticalScrollBarEnabled(false);
        webView.setHorizontalScrollBarEnabled(false);
        webView.setFocusable(true);
        webView.setFocusableInTouchMode(true);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setLoadsImagesAutomatically(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setTextZoom(100);
        webView.addJavascriptInterface(new AppNavigationBridge(), "AndroidNav");
        webView.addJavascriptInterface(new NativeProfileBridge(), "AndroidProfile");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String scheme = uri.getScheme();
                if ("http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme)) {
                    try {
                        startActivity(new Intent(Intent.ACTION_VIEW, uri));
                    } catch (android.content.ActivityNotFoundException ignored) {
                        // Keep the calculator usable if no external browser is available.
                    }
                    return true;
                }
                return false;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                if (resetHistoryAfterHomeLoad && url != null
                        && url.startsWith("file:///android_asset/site/index.html")) {
                    resetHistoryAfterHomeLoad = false;
                    webView.clearHistory();
                }
                injectAppPresentation(view);
            }
        });
        webView.setWebChromeClient(new WebChromeClient());

        bottomNavigation = createBottomNavigation();
        FrameLayout contentFrame = new FrameLayout(this);
        contentFrame.addView(webView, new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT
        ));
        ImageView homeButton = createFloatingButton(R.drawable.nav_home, "Home", () -> openTab("home"));
        FrameLayout.LayoutParams homeParams = new FrameLayout.LayoutParams(dp(50), dp(50), Gravity.TOP | Gravity.START);
        homeParams.setMargins(dp(14), dp(10), 0, 0);
        contentFrame.addView(homeButton, homeParams);

        ImageView profileButton = createFloatingButton(R.drawable.nav_profile, "Profile", () -> openTab("profile"));
        FrameLayout.LayoutParams profileParams = new FrameLayout.LayoutParams(dp(50), dp(50), Gravity.TOP | Gravity.END);
        profileParams.setMargins(0, dp(10), dp(14), 0);
        contentFrame.addView(profileButton, profileParams);

        root.addView(contentFrame, new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f
        ));
        LinearLayout.LayoutParams navLayout = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, dp(58)
        );
        navLayout.setMargins(dp(9), dp(1), dp(9), dp(5));
        root.addView(bottomNavigation, navLayout);
        setContentView(root);
        webView.requestFocus(View.FOCUS_DOWN);
        webView.loadUrl(HOME_URL);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT,
                this::handleBackNavigation
            );
        }
    }

    private void injectAppPresentation(WebView view) {
        String script = "(function(){"
            + "var s=document.getElementById('native-app-presentation');"
            + "if(!s){s=document.createElement('style');s.id='native-app-presentation';"
            + "s.textContent='header{display:none!important}main{padding:76px 14px 18px!important}';"
            + "document.head.appendChild(s);}"
            + "if(!window.__nativeNavBound){window.__nativeNavBound=true;"
            + "document.addEventListener('click',function(e){var a=e.target.closest('[data-page]');"
            + "if(a&&window.AndroidNav)window.AndroidNav.onPageChanged(a.dataset.page);},true);}"
            + "if(window.AndroidNav){var p=location.pathname.endsWith('/index.html')?"
            + "(location.hash.replace('#','')||'home'):'home';window.AndroidNav.onPageChanged(p);}"
            + "})()";
        view.evaluateJavascript(script, null);
    }

    private LinearLayout createBottomNavigation() {
        LinearLayout bar = new LinearLayout(this);
        bar.setOrientation(LinearLayout.HORIZONTAL);
        bar.setGravity(Gravity.CENTER);
        GradientDrawable glass = new GradientDrawable(
            GradientDrawable.Orientation.TOP_BOTTOM,
            new int[]{
                Color.argb(185, 245, 249, 255),
                Color.argb(165, 226, 235, 255),
                Color.argb(175, 235, 231, 255)
            }
        );
        glass.setCornerRadius(dp(20));
        glass.setStroke(dp(1), Color.argb(175, 255, 255, 255));
        bar.setBackground(glass);
        bar.setElevation(dp(16));
        bar.setPadding(dp(6), dp(2), dp(6), dp(2));

        addNavigationItem(bar, "GIR", "gir", R.drawable.nav_gir);
        addNavigationItem(bar, "Nutrition", "nutrition", R.drawable.nav_nutrition);
        addNavigationItem(bar, "Mixer", "mixer", R.drawable.nav_mixer);
        addNavigationItem(bar, "Settings", "settings", R.drawable.nav_settings);
        updateNavigationSelection();
        return bar;
    }

    private void addNavigationItem(LinearLayout bar, String label, String page, int iconId) {
        LinearLayout item = new LinearLayout(this);
        item.setOrientation(LinearLayout.VERTICAL);
        item.setGravity(Gravity.CENTER);
        item.setPadding(dp(3), dp(1), dp(3), dp(1));
        item.setClickable(true);
        item.setFocusable(true);
        item.setContentDescription(label);
        item.setTag(page);

        ImageView icon = new ImageView(this);
        icon.setImageResource(iconId);
        LinearLayout.LayoutParams iconParams = new LinearLayout.LayoutParams(dp(21), dp(21));
        item.addView(icon, iconParams);

        TextView text = new TextView(this);
        text.setText(label);
        text.setTextSize(9.5f);
        text.setTypeface(Typeface.create("sans-serif-medium", Typeface.NORMAL));
        text.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams textParams = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT
        );
        textParams.topMargin = dp(1);
        item.addView(text, textParams);

        item.setOnClickListener(v -> openTab(page));
        bar.addView(item, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.MATCH_PARENT, 1f));
    }

    private ImageView createFloatingButton(int iconId, String label, Runnable action) {
        ImageView button = new ImageView(this);
        button.setImageResource(iconId);
        button.setScaleType(ImageView.ScaleType.CENTER_INSIDE);
        button.setPadding(dp(13), dp(13), dp(13), dp(13));
        GradientDrawable circle = new GradientDrawable();
        circle.setShape(GradientDrawable.OVAL);
        circle.setColor(Color.argb(224, 255, 255, 255));
        circle.setStroke(dp(1), Color.argb(210, 191, 219, 254));
        button.setBackground(circle);
        button.setElevation(dp(10));
        button.setImageTintList(ColorStateList.valueOf(BLUE));
        button.setContentDescription(label);
        button.setClickable(true);
        button.setFocusable(true);
        button.setOnClickListener(v -> action.run());
        return button;
    }

    private void updateNavigationSelection() {
        if (bottomNavigation == null) return;
        for (int i = 0; i < bottomNavigation.getChildCount(); i++) {
            View child = bottomNavigation.getChildAt(i);
            boolean active = selectedPage.equals(String.valueOf(child.getTag()));
            GradientDrawable bg = new GradientDrawable();
            if (active) {
                bg.setOrientation(GradientDrawable.Orientation.LEFT_RIGHT);
                bg.setColors(new int[]{Color.rgb(219, 234, 254), Color.rgb(232, 229, 255)});
            } else {
                bg.setColor(Color.TRANSPARENT);
            }
            bg.setCornerRadius(dp(15));
            child.setBackground(bg);
            if (child instanceof LinearLayout) {
                LinearLayout item = (LinearLayout) child;
                ImageView icon = (ImageView) item.getChildAt(0);
                TextView label = (TextView) item.getChildAt(1);
                int color = active ? BLUE : MUTED;
                icon.setImageTintList(ColorStateList.valueOf(color));
                label.setTextColor(color);
                label.setTypeface(Typeface.create("sans-serif-medium", active ? Typeface.BOLD : Typeface.NORMAL));
            }
        }
    }

    private void setSelectedPage(String page) {
        if (!"home".equals(page) && !"gir".equals(page) && !"nutrition".equals(page) && !"mixer".equals(page) && !"settings".equals(page) && !"profile".equals(page)) {
            page = "home";
        }
        selectedPage = page;
        runOnUiThread(this::updateNavigationSelection);
    }

    private void openTab(String page) {
        setSelectedPage(page);
        if (webView == null) return;
        String script = "(function(){var p='" + page + "';"
            + "if(location.pathname.endsWith('/index.html')&&typeof activatePage==='function'){"
            + "history.replaceState({page:p},'', '#'+p);activatePage(p,true);"
            + "}else{location.href='file:///android_asset/site/index.html#'+p;}})()";
        webView.evaluateJavascript(script, null);
    }

    private int dp(float value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != REQUEST_PROFILE_EXPORT && requestCode != REQUEST_PROFILE_IMPORT) return;
        if (resultCode != RESULT_OK || data == null || data.getData() == null) {
            Toast.makeText(this, "Settings transfer cancelled.", Toast.LENGTH_SHORT).show();
            pendingProfileBackup = null;
            return;
        }
        Uri uri = data.getData();
        if (requestCode == REQUEST_PROFILE_EXPORT) {
            String backup = pendingProfileBackup;
            pendingProfileBackup = null;
            if (backup == null) {
                Toast.makeText(this, "No settings backup is ready to save.", Toast.LENGTH_LONG).show();
                return;
            }
            try (OutputStream output = getContentResolver().openOutputStream(uri)) {
                if (output == null) throw new java.io.IOException("Could not open the selected file.");
                output.write(backup.getBytes("UTF-8"));
                Toast.makeText(this, "Settings backup saved.", Toast.LENGTH_LONG).show();
            } catch (Exception error) {
                Toast.makeText(this, "Could not save settings backup.", Toast.LENGTH_LONG).show();
            }
        } else {
            try (InputStream input = getContentResolver().openInputStream(uri);
                 ByteArrayOutputStream output = new ByteArrayOutputStream()) {
                if (input == null) throw new java.io.IOException("Could not open the selected file.");
                byte[] buffer = new byte[8192];
                int count;
                while ((count = input.read(buffer)) != -1) output.write(buffer, 0, count);
                String json = output.toString("UTF-8");
                if (webView != null) {
                    webView.evaluateJavascript("if(window.handleProfileBackupImport){window.handleProfileBackupImport(" + JSONObject.quote(json) + ");}", null);
                }
            } catch (Exception error) {
                Toast.makeText(this, "Could not read the selected backup file.", Toast.LENGTH_LONG).show();
            }
        }
    }

    public class NativeProfileBridge {
        @JavascriptInterface
        public void saveBackup(String json) {
            if (json == null || json.length() > 1000000) return;
            runOnUiThread(() -> {
                pendingProfileBackup = json;
                Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("application/json");
                intent.putExtra(Intent.EXTRA_TITLE, "neonatal-gir-settings-backup.json");
                startActivityForResult(intent, REQUEST_PROFILE_EXPORT);
            });
        }

        @JavascriptInterface
        public void openBackupPicker() {
            runOnUiThread(() -> {
                Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("application/json");
                startActivityForResult(intent, REQUEST_PROFILE_IMPORT);
            });
        }
    }

    public class AppNavigationBridge {
        @JavascriptInterface
        public void onPageChanged(String page) {
            setSelectedPage(page);
        }
    }

    private void handleBackNavigation() {
        if (webView == null || backActionPending || exitDialogVisible) return;
        backActionPending = true;
        webView.evaluateJavascript(
            "(function(){var path=location.pathname;var hash=location.hash.replace('#','')||'home';"
                + "if(!path.endsWith('/index.html'))return 'outside';"
                + "return hash==='home'?'home':'calculator';})()",
            value -> {
                backActionPending = false;
                if (isFinishing()) return;
                if (value != null && value.contains("home")) {
                    showExitConfirmation();
                } else {
                    openTab("home");
                    webView.clearHistory();
                    setSelectedPage("home");
                }
            }
        );
    }

    @Override
    public boolean onKeyDown(int keyCode, android.view.KeyEvent event) {
        // Redmi Y2 / Android 9 and older MIUI builds can route the hardware Back
        // key through onKeyDown instead of the newer back callbacks.
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU
                && keyCode == android.view.KeyEvent.KEYCODE_BACK && event.getRepeatCount() == 0) {
            handleBackNavigation();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    public void onBackPressed() {
        handleBackNavigation();
    }

    private void showExitConfirmation() {
        if (exitDialogVisible || isFinishing()) return;
        exitDialogVisible = true;
        new AlertDialog.Builder(this)
            .setTitle("Exit app?")
            .setMessage("Are you sure you want to exit?")
            .setNegativeButton("No", (dialog, which) -> exitDialogVisible = false)
            .setPositiveButton("Yes, exit", (dialog, which) -> {
                exitDialogVisible = false;
                finishAndRemoveTask();
            })
            .setOnCancelListener(dialog -> exitDialogVisible = false)
            .show();
    }
}
