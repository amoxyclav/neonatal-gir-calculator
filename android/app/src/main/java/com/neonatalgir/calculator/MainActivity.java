package com.neonatalgir.calculator;

import android.app.Activity;
import android.app.AlertDialog;
import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebSettings;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.graphics.Color;
import android.view.View;
import android.widget.Toast;

public class MainActivity extends Activity {
    private static final String HOME_URL = "file:///android_asset/site/index.html#home";
    private WebView webView;
    private boolean exitDialogVisible = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(244, 247, 251));
        getWindow().setNavigationBarColor(Color.rgb(244, 247, 251));
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(244, 247, 251));
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        webView.setVerticalScrollBarEnabled(false);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setLoadsImagesAutomatically(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                // Keep the bundled calculator and its guide pages inside the app.
                return url.startsWith("http://") || url.startsWith("https://");
            }
        });
        webView.setWebChromeClient(new WebChromeClient());
        setContentView(webView);
        webView.loadUrl(HOME_URL);
    }

    @Override
    public void onBackPressed() {
        if (webView == null) {
            showExitConfirmation();
            return;
        }
        webView.evaluateJavascript(
            "(function(){return location.pathname.endsWith('/index.html') && (!location.hash || location.hash === '#home') ? 'HOME' : 'OTHER';})()",
            value -> {
                if ("\"HOME\"".equals(value)) {
                    showExitConfirmation();
                } else {
                    webView.loadUrl(HOME_URL);
                }
            }
        );
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
