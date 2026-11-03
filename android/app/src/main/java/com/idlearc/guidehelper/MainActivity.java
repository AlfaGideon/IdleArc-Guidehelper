package com.idlearc.guidehelper;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import java.util.Map;

/** Native shell: live game, local offline reference, and a read-only snapshot panel. */
public final class MainActivity extends Activity {
    private static final String GAME = "https://idlearc.com/";
    private static final int BG = Color.rgb(8, 11, 19), PANEL = Color.rgb(17, 24, 39);
    private static final int TEXT = Color.rgb(231, 237, 248), MUTED = Color.rgb(152, 171, 194);
    private static final int BLUE = Color.rgb(111, 194, 255);
    private final Handler handler = new Handler();
    private WebView game, guide;
    private FrameLayout stage;
    private LinearLayout analysis, stats, tabs;
    private TextView status;
    private int page = 0;
    private Snapshot latest = new Snapshot();
    private boolean loaded = false;
    private final Runnable ticker = new Runnable() {
        @Override public void run() {
            if (game != null && loaded) sample();
            handler.postDelayed(this, 5000);
        }
    };

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(BG);
        getWindow().setNavigationBarColor(BG);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(BG);
        // Android 15 enforces edge-to-edge; keep controls clear of system bars.
        root.setOnApplyWindowInsetsListener((v, insets) -> {
            if (android.os.Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets bars = insets.getInsets(android.view.WindowInsets.Type.systemBars());
                v.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            } else {
                v.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(),
                        insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            }
            return insets;
        });
        setContentView(root);

        LinearLayout header = new LinearLayout(this);
        header.setGravity(Gravity.CENTER_VERTICAL);
        header.setPadding(dp(18), dp(12), dp(18), dp(12));
        header.setBackgroundColor(PANEL);
        root.addView(header, new LinearLayout.LayoutParams(-1, dp(69)));
        LinearLayout titles = new LinearLayout(this);
        titles.setOrientation(LinearLayout.VERTICAL);
        header.addView(titles, new LinearLayout.LayoutParams(0, -2, 1));
        TextView name = label("IdleArc  /  Guide", 19, TEXT, true);
        titles.addView(name);
        titles.addView(label("НЕОФИЦИАЛЬНЫЙ КОМПАНЬОН", 10, MUTED, false));
        status = label("Подключение…", 11, BLUE, false);
        header.addView(status);

        stage = new FrameLayout(this);
        root.addView(stage, new LinearLayout.LayoutParams(-1, 0, 1));
        game = web();
        game.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                if (!req.isForMainFrame()) return false;
                if (isGame(req.getUrl())) return false;
                openExternal(req.getUrl());
                return true;
            }
            @Override public void onPageFinished(WebView view, String url) {
                loaded = isGame(Uri.parse(url));
                status.setText(loaded ? "ИГРА ОНЛАЙН" : "ВНЕ ИГРЫ");
                if (loaded) sample();
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, android.webkit.WebResourceError error) {
                if (request.isForMainFrame()) status.setText("НЕТ СОЕДИНЕНИЯ");
            }
        });
        game.setWebChromeClient(new WebChromeClient());
        stage.addView(game);

        guide = web();
        guide.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                if (!req.isForMainFrame()) return false;
                if (AssetPage.ORIGIN.equals(req.getUrl().getScheme() + "://" + req.getUrl().getHost())) return false;
                openExternal(req.getUrl());
                return true;
            }
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
                WebResourceResponse local = AssetPage.open(getAssets(), req.getUrl().toString());
                // No outside scripts or requests from the offline reference.
                return local != null ? local : new WebResourceResponse("text/plain", "UTF-8", null);
            }
        });
        stage.addView(guide);
        analysis = new LinearLayout(this);
        analysis.setOrientation(LinearLayout.VERTICAL);
        stage.addView(analysis, new FrameLayout.LayoutParams(-1, -1));
        buildAnalysis();

        tabs = new LinearLayout(this);
        tabs.setBackgroundColor(PANEL);
        root.addView(tabs, new LinearLayout.LayoutParams(-1, dp(68)));
        game.loadUrl(GAME);
        guide.loadUrl(AssetPage.HOME);
        select(0);
        handler.postDelayed(ticker, 5000);
    }

    private void buildAnalysis() {
        ScrollView scroll = new ScrollView(this);
        analysis.addView(scroll, new LinearLayout.LayoutParams(-1, 0, 1));
        LinearLayout body = new LinearLayout(this);
        body.setOrientation(LinearLayout.VERTICAL);
        body.setPadding(dp(20), dp(24), dp(20), dp(20));
        scroll.addView(body);
        body.addView(label("АНАЛИЗАТОР", 12, BLUE, true));
        TextView heading = label("Снимок персонажа", 26, TEXT, true);
        body.addView(heading);
        TextView intro = label("Читает только доступные числовые показатели с открытой страницы игры. Данные не отправляются и не сохраняются. Это не перехват трафика или файлов игры.", 14, MUTED, false);
        intro.setPadding(0, dp(10), 0, dp(20));
        body.addView(intro);
        Button refresh = new Button(this);
        refresh.setText("Обновить показатели");
        refresh.setTextColor(BG);
        refresh.setBackgroundTintList(android.content.res.ColorStateList.valueOf(BLUE));
        body.addView(refresh, new LinearLayout.LayoutParams(-1, dp(52)));
        refresh.setOnClickListener(v -> sample());
        stats = new LinearLayout(this);
        stats.setOrientation(LinearLayout.VERTICAL);
        LinearLayout.LayoutParams sp = new LinearLayout.LayoutParams(-1, -2);
        sp.topMargin = dp(18);
        body.addView(stats, sp);
        renderStats();
        TextView note = label("Значения распознаются по подписям в интерфейсе IdleArc. Если сайт изменит разметку или показателей нет на текущем экране, откройте вкладку с характеристиками в игре и нажмите «Обновить». Возможны неточности: сверяйте с игрой.", 12, MUTED, false);
        note.setPadding(0, dp(18), 0, dp(12));
        body.addView(note);
    }

    private void renderStats() {
        stats.removeAllViews();
        if (latest.values.isEmpty()) {
            stats.addView(label("Пока нет распознанных показателей. Откройте экран персонажа в игре.", 16, MUTED, false));
            return;
        }
        for (Map.Entry<String, String> entry : latest.values.entrySet()) {
            LinearLayout card = new LinearLayout(this);
            card.setGravity(Gravity.CENTER_VERTICAL);
            card.setPadding(dp(16), dp(10), dp(16), dp(10));
            card.setBackgroundColor(PANEL);
            LinearLayout.LayoutParams cp = new LinearLayout.LayoutParams(-1, dp(64));
            cp.bottomMargin = dp(8);
            stats.addView(card, cp);
            card.addView(label(entry.getKey(), 15, MUTED, false), new LinearLayout.LayoutParams(0, -2, 1));
            card.addView(label(entry.getValue(), 20, TEXT, true));
        }
    }

    private void sample() {
        if (!loaded || !isGame(Uri.parse(game.getUrl() == null ? "" : game.getUrl()))) return;
        String sampledUrl = game.getUrl();
        game.evaluateJavascript(Probe.JS, value -> {
            if (!isFinishing() && sampledUrl.equals(game.getUrl()) && isGame(Uri.parse(sampledUrl))) {
                latest = Snapshot.parse(value);
                renderStats();
            }
        });
    }

    private void select(int target) {
        page = target;
        game.setVisibility(target == 0 ? View.VISIBLE : View.GONE);
        guide.setVisibility(target == 1 ? View.VISIBLE : View.GONE);
        analysis.setVisibility(target == 2 ? View.VISIBLE : View.GONE);
        tabs.removeAllViews();
        String[] names = {"◈  Игра", "▤  Справочник", "▥  Анализ"};
        for (int i = 0; i < names.length; i++) {
            final int index = i;
            TextView tab = label(names[i], 13, i == target ? BLUE : MUTED, i == target);
            tab.setGravity(Gravity.CENTER);
            tabs.addView(tab, new LinearLayout.LayoutParams(0, -1, 1));
            tab.setOnClickListener(v -> select(index));
        }
        if (target == 2) sample();
    }

    private WebView web() {
        WebView view = new WebView(this);
        view.setBackgroundColor(BG);
        view.getSettings().setJavaScriptEnabled(true);
        view.getSettings().setDomStorageEnabled(true);
        view.getSettings().setAllowFileAccess(false);
        view.getSettings().setAllowContentAccess(false);
        view.getSettings().setJavaScriptCanOpenWindowsAutomatically(false);
        view.getSettings().setSupportMultipleWindows(false);
        view.getSettings().setMixedContentMode(android.webkit.WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        return view;
    }

    private boolean isGame(Uri uri) {
        String host = uri.getHost();
        return "https".equals(uri.getScheme()) && uri.getPort() == -1
                && ("idlearc.com".equalsIgnoreCase(host) || "www.idlearc.com".equalsIgnoreCase(host));
    }
    private void openExternal(Uri uri) {
        try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); }
        catch (Exception ignored) { status.setText("НЕТ БРАУЗЕРА"); }
    }
    private TextView label(String text, int size, int color, boolean bold) {
        TextView view = new TextView(this);
        view.setText(text);
        view.setTextSize(size);
        view.setTextColor(color);
        if (bold) view.setTypeface(null, Typeface.BOLD);
        return view;
    }
    private int dp(int value) { return (int) (value * getResources().getDisplayMetrics().density + .5f); }
    @Override public void onBackPressed() {
        if (page == 0 && game.canGoBack()) game.goBack();
        else if (page == 1 && guide.canGoBack()) guide.goBack();
        else if (page != 0) select(0);
        else super.onBackPressed();
    }
    @Override protected void onDestroy() {
        handler.removeCallbacks(ticker);
        stage.removeView(game); stage.removeView(guide);
        game.destroy(); guide.destroy();
        super.onDestroy();
    }
}
