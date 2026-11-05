package com.idlearc.guidehelper;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.view.MotionEvent;
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
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.text.SimpleDateFormat;

/** Native shell: live game, local offline reference, and a read-only snapshot panel. */
public final class MainActivity extends Activity {
    private static final String GAME = "https://idlearc.com/";
    private static final int BG = Color.rgb(8, 11, 19), PANEL = Color.rgb(17, 24, 39);
    private static final int TEXT = Color.rgb(231, 237, 248), MUTED = Color.rgb(152, 171, 194);
    private static final int BLUE = Color.rgb(111, 194, 255);
    private final Handler handler = new Handler();
    private WebView game, guide, popup;
    private FrameLayout popupLayer;
    private boolean googleNoticeVisible;
    private FrameLayout stage;
    private LinearLayout analysis, stats, tabs, logsPage, logRows;
    private TextView logSummary;
    private Button pauseLogs;
    private final SessionLog sessionLog = new SessionLog();
    private final Runnable logRenderer = this::renderLogs;
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
        sessionLog.setOnChange(() -> handler.post(() -> {
            if (page == 3 && !isFinishing()) {
                handler.removeCallbacks(logRenderer);
                handler.postDelayed(logRenderer, 400);
            }
        }));

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
        Button update = new Button(this);
        update.setText("↻ APK");
        update.setTextSize(11);
        update.setContentDescription("Проверить обновление на GitHub");
        LinearLayout.LayoutParams updateParams = new LinearLayout.LayoutParams(dp(80), dp(48));
        updateParams.leftMargin = dp(8);
        header.addView(update, updateParams);
        update.setOnClickListener(v -> {
            sessionLog.event("Действие", "Проверка обновления APK");
            UpdateManager.check(this, update, detail -> sessionLog.event("Система", detail));
        });

        stage = new FrameLayout(this);
        root.addView(stage, new LinearLayout.LayoutParams(-1, 0, 1));
        game = web();
        game.setWebViewClient(gameClient(false));
        game.getSettings().setSupportMultipleWindows(true);
        game.getSettings().setJavaScriptCanOpenWindowsAutomatically(false);
        game.setOnTouchListener((v, event) -> {
            if (event.getActionMasked() == MotionEvent.ACTION_UP)
                sessionLog.event("Действие", "Касание в игре (без текста и координат)");
            return false;
        });
        game.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onCreateWindow(WebView view, boolean dialog, boolean userGesture, android.os.Message resultMsg) {
                if (!userGesture || popup != null) return false;
                openPopup(resultMsg);
                return true;
            }
            @Override public void onCloseWindow(WebView window) { closePopup(); }
        });
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
        popupLayer = new FrameLayout(this);
        stage.addView(popupLayer, new FrameLayout.LayoutParams(-1, -1));
        popupLayer.setVisibility(View.GONE);
        analysis = new LinearLayout(this);
        analysis.setOrientation(LinearLayout.VERTICAL);
        stage.addView(analysis, new FrameLayout.LayoutParams(-1, -1));
        buildAnalysis();
        logsPage = new LinearLayout(this);
        logsPage.setOrientation(LinearLayout.VERTICAL);
        stage.addView(logsPage, new FrameLayout.LayoutParams(-1, -1));
        buildLogs();

        tabs = new LinearLayout(this);
        tabs.setBackgroundColor(PANEL);
        root.addView(tabs, new LinearLayout.LayoutParams(-1, dp(68)));
        game.loadUrl(GAME);
        guide.loadUrl(AssetPage.HOME);
        select(0);
        sessionLog.event("Система", "Приложение запущено · логи только в памяти");
        handler.postDelayed(ticker, 5000);
    }

    private WebViewClient gameClient(boolean isPopup) {
        return new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                if (!req.isForMainFrame()) return false;
                Uri url = req.getUrl();
                if (isGoogleSignIn(url)) {
                    sessionLog.navigation("Google-вход недоступен в WebView", url.toString());
                    showGoogleNotice(); return true;
                }
                // OAuth providers (except Google) can stay inside this APK. No silent browser launch.
                if ("https".equals(url.getScheme()) && url.getPort() == -1) {
                    sessionLog.navigation("Переход", url.toString());
                    return false;
                }
                if ("http".equals(url.getScheme()) && url.getPort() == -1) {
                    status.setText("НЕЗАЩИЩЁННАЯ ССЫЛКА");
                    sessionLog.navigation("HTTP заблокирован", url.toString());
                    return true;
                }
                sessionLog.event("Система", "Внешняя схема ссылки (адрес скрыт)");
                openExternal(url);
                return true;
            }
            @Override public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                // A popup's first URL may bypass shouldOverrideUrlLoading.
                if (isGoogleSignIn(Uri.parse(url))) { view.stopLoading(); showGoogleNotice(); }
                else sessionLog.navigation(isPopup ? "Окно входа" : "Открытие", url);
            }
            @Override public void onPageFinished(WebView view, String url) {
                String host = Uri.parse(url).getHost();
                sessionLog.navigation("Загружено", url);
                if (isPopup) {
                    status.setText(host == null ? "ОКНО ВХОДА" : host);
                    return;
                }
                loaded = isGame(Uri.parse(url));
                status.setText(loaded ? "ИГРА ОНЛАЙН" : host == null ? "ВНЕ ИГРЫ" : host);
                if (loaded) sample();
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, android.webkit.WebResourceError error) {
                if (request.isForMainFrame()) {
                    status.setText("НЕТ СОЕДИНЕНИЯ");
                    sessionLog.navigation("Ошибка сети (" + error.getErrorCode() + ")", request.getUrl().toString());
                }
            }
            @Override public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse response) {
                if (request.isForMainFrame())
                    sessionLog.navigation("HTTP " + response.getStatusCode(), request.getUrl().toString());
            }
            @Override public void onReceivedSslError(WebView view, android.webkit.SslErrorHandler handler, android.net.http.SslError error) {
                sessionLog.event("Ошибка", "Ошибка TLS · соединение отменено");
                handler.cancel();
            }
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                sessionLog.request(request.getUrl().toString());
                return null; // Observe the destination only; WebView performs the real request.
            }
        };
    }

    private boolean isGoogleSignIn(Uri url) {
        String host = url.getHost();
        return host != null && (host.equalsIgnoreCase("accounts.google.com")
                || host.equalsIgnoreCase("myaccount.google.com"));
    }

    private void showGoogleNotice() {
        if (googleNoticeVisible || isFinishing()) return;
        googleNoticeVisible = true;
        new AlertDialog.Builder(this)
                .setTitle("Вход через Google")
                .setMessage("Google запрещает авторизацию OAuth во встроенном WebView. " +
                        "Без поддержки со стороны IdleArc нельзя безопасно завершить вход через Google " +
                        "и передать сессию обратно в приложение. Можно войти другим способом на сайте " +
                        "прямо здесь. Открытие Google в браузере также не перенесёт сессию в приложение автоматически.")
                .setPositiveButton("Понятно", (d, w) -> closePopup())
                .setOnDismissListener(d -> googleNoticeVisible = false)
                .show();
    }

    private void openPopup(android.os.Message resultMsg) {
        popupLayer.removeAllViews();
        popupLayer.setBackgroundColor(BG);
        LinearLayout column = new LinearLayout(this);
        column.setOrientation(LinearLayout.VERTICAL);
        popupLayer.addView(column, new FrameLayout.LayoutParams(-1, -1));
        Button close = new Button(this);
        close.setText("Закрыть окно входа  ×");
        close.setOnClickListener(v -> closePopup());
        column.addView(close, new LinearLayout.LayoutParams(-1, dp(50)));
        popup = web();
        popup.setOnTouchListener((v, event) -> {
            if (event.getActionMasked() == MotionEvent.ACTION_UP)
                sessionLog.event("Действие", "Касание в окне входа (без текста и координат)");
            return false;
        });
        sessionLog.event("Система", "Окно входа открыто");
        popup.setWebViewClient(gameClient(true));
        column.addView(popup, new LinearLayout.LayoutParams(-1, 0, 1));
        popupLayer.setVisibility(page == 0 ? View.VISIBLE : View.GONE);
        if (page == 0) popupLayer.bringToFront();
        WebView.WebViewTransport transport = (WebView.WebViewTransport) resultMsg.obj;
        transport.setWebView(popup);
        resultMsg.sendToTarget();
    }

    private void closePopup() {
        if (popup == null) return;
        popup.stopLoading();
        popupLayer.removeAllViews();
        popup.destroy();
        popup = null;
        popupLayer.setVisibility(View.GONE);
        sessionLog.event("Система", "Окно входа закрыто");
        Uri current = Uri.parse(game.getUrl() == null ? "" : game.getUrl());
        status.setText(isGame(current) ? "ИГРА ОНЛАЙН" : current.getHost() == null ? "ВНЕ ИГРЫ" : current.getHost());
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
        refresh.setOnClickListener(v -> {
            sessionLog.event("Действие", "Запрошен снимок показателей");
            sample();
        });
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

    private void buildLogs() {
        logsPage.setPadding(dp(16), dp(16), dp(16), dp(10));
        logsPage.addView(label("ЖУРНАЛ СЕАНСА", 12, BLUE, true));
        logsPage.addView(label("Логи соединений", 24, TEXT, true));
        TextView note = label("Только текущий запуск APK. Видны касания без содержимого, переходы, домены запросов и ошибки. Пароли, текст форм, cookie, тела запросов и параметры URL не записываются. Это не полный сетевой трафик игры.", 12, MUTED, false);
        note.setPadding(0, dp(8), 0, dp(8));
        logsPage.addView(note);
        logSummary = label("", 13, BLUE, true);
        logsPage.addView(logSummary);

        LinearLayout actions = new LinearLayout(this);
        logsPage.addView(actions, new LinearLayout.LayoutParams(-1, dp(52)));
        pauseLogs = new Button(this);
        pauseLogs.setTextSize(12);
        actions.addView(pauseLogs, new LinearLayout.LayoutParams(0, -1, 1));
        pauseLogs.setOnClickListener(v -> {
            sessionLog.setPaused(!sessionLog.isPaused());
            renderLogs();
        });
        Button clear = new Button(this);
        clear.setText("Очистить"); clear.setTextSize(12);
        actions.addView(clear, new LinearLayout.LayoutParams(0, -1, 1));
        clear.setOnClickListener(v -> { sessionLog.clear(); renderLogs(); });
        Button copy = new Button(this);
        copy.setText("Копия"); copy.setTextSize(12);
        actions.addView(copy, new LinearLayout.LayoutParams(0, -1, 1));
        copy.setOnClickListener(v -> {
            StringBuilder text = new StringBuilder("IdleArc Guide · журнал текущего сеанса\n");
            SimpleDateFormat format = new SimpleDateFormat("HH:mm:ss", Locale.getDefault());
            for (SessionLog.Entry item : sessionLog.snapshot())
                text.append(format.format(new Date(item.time))).append("  ").append(item.type).append("  ").append(item.description).append('\n');
            ClipboardManager clipboard = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
            clipboard.setPrimaryClip(ClipData.newPlainText("IdleArc: логи", text.toString()));
            sessionLog.event("Действие", "Журнал скопирован вручную");
        });

        ScrollView scroll = new ScrollView(this);
        LinearLayout.LayoutParams scrollParams = new LinearLayout.LayoutParams(-1, 0, 1);
        scrollParams.topMargin = dp(10);
        logsPage.addView(scroll, scrollParams);
        logRows = new LinearLayout(this);
        logRows.setOrientation(LinearLayout.VERTICAL);
        scroll.addView(logRows);
        renderLogs();
    }

    private void renderLogs() {
        if (logRows == null || logSummary == null) return;
        List<SessionLog.Entry> entries = sessionLog.snapshot();
        logSummary.setText("Запросов: " + sessionLog.requests() + "  ·  записей: " + entries.size()
                + (sessionLog.isPaused() ? "  ·  ПАУЗА" : ""));
        pauseLogs.setText(sessionLog.isPaused() ? "Продолжить" : "Пауза");
        logRows.removeAllViews();
        if (entries.isEmpty()) {
            logRows.addView(label("Записей пока нет. Перейдите в игру или обновите страницу.", 14, MUTED, false));
            return;
        }
        SimpleDateFormat format = new SimpleDateFormat("HH:mm:ss", Locale.getDefault());
        for (int i = entries.size() - 1; i >= Math.max(0, entries.size() - 120); i--) {
            SessionLog.Entry item = entries.get(i);
            TextView row = label(format.format(new Date(item.time)) + "  •  " + item.type + "\n" + item.description,
                    13, "Ошибка".equals(item.type) ? Color.rgb(255, 161, 149) : TEXT, false);
            row.setPadding(dp(12), dp(10), dp(12), dp(10));
            row.setBackgroundColor(PANEL);
            LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(-1, -2);
            params.bottomMargin = dp(5);
            logRows.addView(row, params);
        }
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
                Snapshot next = Snapshot.parse(value);
                if (!latest.values.equals(next.values))
                    sessionLog.event("Анализ", "Обновлены показатели · полей: " + next.values.size());
                latest = next;
                renderStats();
            }
        });
    }

    private void select(int target) {
        page = target;
        game.setVisibility(target == 0 ? View.VISIBLE : View.GONE);
        guide.setVisibility(target == 1 ? View.VISIBLE : View.GONE);
        analysis.setVisibility(target == 2 ? View.VISIBLE : View.GONE);
        logsPage.setVisibility(target == 3 ? View.VISIBLE : View.GONE);
        popupLayer.setVisibility(popup != null && target == 0 ? View.VISIBLE : View.GONE);
        if (popupLayer.getVisibility() == View.VISIBLE) popupLayer.bringToFront();
        tabs.removeAllViews();
        String[] names = {"◈ Игра", "▤ Справка", "▥ Анализ", "☷ Логи"};
        for (int i = 0; i < names.length; i++) {
            final int index = i;
            TextView tab = label(names[i], 12, i == target ? BLUE : MUTED, i == target);
            tab.setGravity(Gravity.CENTER);
            tabs.addView(tab, new LinearLayout.LayoutParams(0, -1, 1));
            tab.setOnClickListener(v -> select(index));
        }
        sessionLog.event("Действие", "Открыта вкладка · " + names[target]);
        if (target == 2) sample();
        if (target == 3) renderLogs();
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
        if (page == 1 && guide.canGoBack()) guide.goBack();
        else if (page != 0) select(0);
        else if (popup != null) {
            if (popup.canGoBack()) popup.goBack(); else closePopup();
        }
        else if (game.canGoBack()) game.goBack();
        else super.onBackPressed();
    }
    @Override protected void onDestroy() {
        handler.removeCallbacks(ticker);
        handler.removeCallbacks(logRenderer);
        closePopup();
        stage.removeView(game); stage.removeView(guide);
        game.destroy(); guide.destroy();
        super.onDestroy();
    }
}
