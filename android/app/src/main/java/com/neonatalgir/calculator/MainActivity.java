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
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

public class MainActivity extends Activity {
    private static final String HOME_URL = "file:///android_asset/site/index.html#home";
    private static final int BLUE = Color.rgb(37, 99, 235);
    private static final int MUTED = Color.rgb(113, 128, 150);
    private static final int ACTIVE_BG = Color.rgb(232, 241, 255);
    private WebView webView;
    private LinearLayout bottomNavigation;
    private boolean exitDialogVisible = false;
    private boolean resetHistoryAfterHomeLoad = false;
    private String selectedPage = "home";
    private String pendingAuthCallback;

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
        webView.addJavascriptInterface(new NativeAuthBridge(), "AndroidAuth");
        captureAuthCallback(getIntent());

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
                deliverPendingAuthCallback();
            }
        });
        webView.setWebChromeClient(new WebChromeClient());

        bottomNavigation = createBottomNavigation();
        root.addView(webView, new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f
        ));
        LinearLayout.LayoutParams navLayout = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, dp(72)
        );
        navLayout.setMargins(dp(10), dp(2), dp(10), dp(7));
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
            + "s.textContent='header{display:none!important}main{padding-top:14px!important} .wrap{padding-top:14px!important}';"
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
        glass.setCornerRadius(dp(24));
        glass.setStroke(dp(1), Color.argb(175, 255, 255, 255));
        bar.setBackground(glass);
        bar.setElevation(dp(16));
        bar.setPadding(dp(8), dp(5), dp(8), dp(5));

        addNavigationItem(bar, "Home", "home", R.drawable.nav_home);
        addNavigationItem(bar, "GIR", "gir", R.drawable.nav_gir);
        addNavigationItem(bar, "Nutrition", "nutrition", R.drawable.nav_nutrition);
        addNavigationItem(bar, "Mixer", "mixer", R.drawable.nav_mixer);
        updateNavigationSelection();
        return bar;
    }

    private void addNavigationItem(LinearLayout bar, String label, String page, int iconId) {
        LinearLayout item = new LinearLayout(this);
        item.setOrientation(LinearLayout.VERTICAL);
        item.setGravity(Gravity.CENTER);
        item.setPadding(dp(4), dp(5), dp(4), dp(4));
        item.setClickable(true);
        item.setFocusable(true);
        item.setContentDescription(label);
        item.setTag(page);

        ImageView icon = new ImageView(this);
        icon.setImageResource(iconId);
        LinearLayout.LayoutParams iconParams = new LinearLayout.LayoutParams(dp(23), dp(23));
        item.addView(icon, iconParams);

        TextView text = new TextView(this);
        text.setText(label);
        text.setTextSize(10);
        text.setTypeface(Typeface.create("sans-serif-medium", Typeface.NORMAL));
        text.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams textParams = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT
        );
        textParams.topMargin = dp(3);
        item.addView(text, textParams);

        item.setOnClickListener(v -> openTab(page));
        bar.addView(item, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.MATCH_PARENT, 1f));
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
        if (!"home".equals(page) && !"gir".equals(page) && !"nutrition".equals(page) && !"mixer".equals(page)) {
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

    private void captureAuthCallback(Intent intent) {
        Uri data = intent == null ? null : intent.getData();
        if (data != null && "neonatalgir".equals(data.getScheme()) && "auth-callback".equals(data.getHost())) {
            pendingAuthCallback = data.toString();
        }
    }

    private void deliverPendingAuthCallback() {
        if (webView == null || pendingAuthCallback == null) return;
        String callback = pendingAuthCallback;
        pendingAuthCallback = null;
        webView.evaluateJavascript("if(window.handleNativeAuthCallback){window.handleNativeAuthCallback(" + JSONObject.quote(callback) + ");}", null);
    }

    public class NativeAuthBridge {
        @JavascriptInterface
        public boolean openAuthUrl(String value) {
            try {
                Uri uri = Uri.parse(value);
                String host = uri.getHost();
                String path = uri.getPath();
                if (!"https".equalsIgnoreCase(uri.getScheme())
                        || !"edazqjqqvgxbvotydhrw.supabase.co".equalsIgnoreCase(host)
                        || path == null || !path.startsWith("/auth/v1/authorize")
                        || uri.getUserInfo() != null || uri.getPort() != -1) {
                    return false;
                }
                runOnUiThread(() -> startActivity(new Intent(Intent.ACTION_VIEW, uri)));
                return true;
            } catch (Exception ignored) {
                return false;
            }
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        captureAuthCallback(intent);
        deliverPendingAuthCallback();
    }

    public class AppNavigationBridge {
        @JavascriptInterface
        public void onPageChanged(String page) {
            setSelectedPage(page);
        }
    }

    private void handleBackNavigation() {
        if (webView == null) {
            finishAndRemoveTask();
            return;
        }
        // Return a simple string so older WebView versions can reliably identify the current page.
        webView.evaluateJavascript(
            "(function(){var path=location.pathname;var hash=location.hash.replace('#','')||'home';"
                + "if(!path.endsWith('/index.html'))return 'outside';"
                + "return hash==='home'?'home':'calculator';})()",
            value -> {
                if (isFinishing()) return;
                if (value != null && value.contains("calculator")) {
                    webView.evaluateJavascript(
                        "(function(){history.replaceState({page:'home'},'', '#home');"
                            + "if(typeof activatePage==='function'){activatePage('home',true);}"
                            + "else{location.hash='#home';}})()",
                        null
                    );
                    webView.clearHistory();
                    setSelectedPage("home");
                } else {
                    // On Home (or if the WebView cannot report its page), Back closes and removes the app task.
                    finishAndRemoveTask();
                }
            }
        );
    }

    @Override
    public boolean dispatchKeyEvent(android.view.KeyEvent event) {
        if (event.getKeyCode() == android.view.KeyEvent.KEYCODE_BACK
                && event.getAction() == android.view.KeyEvent.ACTION_UP) {
            handleBackNavigation();
            return true;
        }
        return super.dispatchKeyEvent(event);
    }

    @Override
    public boolean onKeyDown(int keyCode, android.view.KeyEvent event) {
        // Redmi Y2 / Android 9 and older MIUI builds can route the hardware Back
        // key through onKeyDown instead of the newer back callbacks.
        if (keyCode == android.view.KeyEvent.KEYCODE_BACK && event.getRepeatCount() == 0) {
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
            .setTitle("Exit calculator?")
            .setMessage("You are on the Home page. Do you want to close the app?")
            .setNegativeButton("Stay", (dialog, which) -> exitDialogVisible = false)
            .setPositiveButton("Exit", (dialog, which) -> {
                exitDialogVisible = false;
                finishAndRemoveTask();
            })
            .setOnCancelListener(dialog -> exitDialogVisible = false)
            .show();
    }
}
