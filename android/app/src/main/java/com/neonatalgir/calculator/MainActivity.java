package com.neonatalgir.calculator;

import android.app.Activity;
import android.app.AlertDialog;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {
    private static final String HOME_URL = "file:///android_asset/site/index.html#home";
    private WebView webView;
    private boolean exitDialogVisible = false;
    private boolean resetHistoryAfterHomeLoad = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getWindow().setStatusBarColor(Color.WHITE);
        getWindow().setNavigationBarColor(Color.WHITE);
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR
        );

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

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                // Keep the bundled calculator and guide pages inside the app.
                return url.startsWith("http://") || url.startsWith("https://");
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                if (resetHistoryAfterHomeLoad && url != null
                        && url.startsWith("file:///android_asset/site/index.html")) {
                    resetHistoryAfterHomeLoad = false;
                    webView.clearHistory();
                }
            }
        });

        webView.setWebChromeClient(new WebChromeClient());
        setContentView(webView);
        webView.requestFocus(View.FOCUS_DOWN);
        webView.loadUrl(HOME_URL);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT,
                this::handleBackNavigation
            );
        }
    }

    private void handleBackNavigation() {
        if (webView == null) {
            showExitConfirmation();
            return;
        }

        webView.evaluateJavascript(
            "(function(){"
                + "var path=location.pathname;"
                + "var hash=location.hash.replace('#','')||'home';"
                + "return JSON.stringify({home:path.endsWith('/index.html')&&hash==='home',calculator:path.endsWith('/index.html'),hash:hash});"
                + "})()",
            value -> {
                if (value == null || "null".equals(value)) {
                    showExitConfirmation();
                    return;
                }

                boolean onHome = value.contains(""home":true");
                boolean onCalculator = value.contains(""calculator":true");

                if (onHome) {
                    // Home is the root of the app. The next back action asks to exit.
                    showExitConfirmation();
                } else if (onCalculator) {
                    // Never replay calculator hash history: one back action returns to Home.
                    webView.evaluateJavascript(
                        "(function(){history.replaceState({page:'home'},'', '#home');"
                            + "if(typeof activatePage==='function'){activatePage('home',true);}"
                            + "else{location.hash='#home';}})()",
                        null
                    );
                    webView.clearHistory();
                } else {
                    // Guide pages are separate bundled documents. One back action returns Home,
                    // then the next back action asks whether to exit.
                    resetHistoryAfterHomeLoad = true;
                    webView.loadUrl(HOME_URL);
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