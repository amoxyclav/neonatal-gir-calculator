package com.neonatalgir.calculator;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.net.Uri;
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
    private static final int BLUE = Color.rgb(37, 89, 197);
    private static final int MUTED = Color.rgb(113, 128, 150);
    private static final int ACTIVE_BG = Color.rgb(237, 244, 255);
    private WebView webView;
    private LinearLayout bottomNavigation;
    private boolean exitDialogVisible = false;
    private boolean resetHistoryAfterHomeLoad = false;
    private String selectedPage = "home";

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
        root.setBackgroundColor(Color.rgb(244, 247, 251));

        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(244, 247, 251));
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
        root.addView(webView, new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f
        ));
        root.addView(bottomNavigation, new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, dp(68)
        ));
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
        bar.setBackgroundColor(Color.WHITE);
        bar.setElevation(dp(10));
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
            bg.setColor(active ? ACTIVE_BG : Color.TRANSPARENT);
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

    public class AppNavigationBridge {
        @JavascriptInterface
        public void onPageChanged(String page) {
            setSelectedPage(page);
        }
    }

    private void handleBackNavigation() {
        if (webView == null) {
            showExitConfirmation();
            return;
        }
        webView.evaluateJavascript(
            "(function(){var path=location.pathname;var hash=location.hash.replace('#','')||'home';"
                + "return JSON.stringify({home:path.endsWith('/index.html')&&hash==='home',calculator:path.endsWith('/index.html')});})()",
            value -> {
                if (value == null || "null".equals(value)) {
                    showExitConfirmation();
                    return;
                }
                boolean onHome = value.contains("\"home\":true");
                boolean onCalculator = value.contains("\"calculator\":true");
                if (onHome) {
                    showExitConfirmation();
                } else if (onCalculator) {
                    webView.evaluateJavascript(
                        "(function(){history.replaceState({page:'home'},'', '#home');"
                            + "if(typeof activatePage==='function'){activatePage('home',true);}"
                            + "else{location.hash='#home';}})()",
                        null
                    );
                    webView.clearHistory();
                    setSelectedPage("home");
                } else {
                    resetHistoryAfterHomeLoad = true;
                    webView.loadUrl(HOME_URL);
                    setSelectedPage("home");
                }
            }
        );
    }

    @Override
    public void onBackPressed() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            handleBackNavigation();
        } else {
            super.onBackPressed();
        }
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
                finish();
            })
            .setOnCancelListener(dialog -> exitDialogVisible = false)
            .show();
    }
}
