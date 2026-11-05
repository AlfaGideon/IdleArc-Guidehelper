package com.idlearc.guidehelper;

import java.net.URI;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/** Bounded, memory-only activity log. Never stores URLs, headers, bodies or form values. */
final class SessionLog {
    static final int LIMIT = 300;
    static final class Entry {
        final long time;
        final String type;
        final String description;
        Entry(long time, String type, String description) {
            this.time = time;
            this.type = type;
            this.description = description;
        }
    }
    private final ArrayDeque<Entry> entries = new ArrayDeque<>();
    private Runnable onChange;
    private boolean paused;
    private long requestCount;
    private long requestWindow;
    private int shownInWindow;

    synchronized void setOnChange(Runnable callback) { onChange = callback; }
    synchronized boolean isPaused() { return paused; }
    synchronized long requests() { return requestCount; }
    synchronized List<Entry> snapshot() { return new ArrayList<>(entries); }

    void setPaused(boolean value) {
        Runnable callback;
        synchronized (this) {
            paused = value;
            callback = onChange;
        }
        if (callback != null) callback.run();
    }

    void clear() {
        Runnable callback;
        synchronized (this) {
            entries.clear(); requestCount = 0; requestWindow = 0; shownInWindow = 0;
            callback = onChange;
        }
        if (callback != null) callback.run();
    }

    // Only call with fixed app-controlled strings (never a URL or page text).
    void event(String type, String description) { add(type, description); }

    void navigation(String action, String url) {
        add("Переход", action + " · " + host(url));
    }

    void request(String url) {
        String domain = host(url);
        if ("домен скрыт".equals(domain)) return;
        Runnable callback = null;
        synchronized (this) {
            if (paused) return;
            requestCount++;
            long now = System.currentTimeMillis();
            if (now - requestWindow >= 1000) { requestWindow = now; shownInWindow = 0; }
            // Show at most four individual requests per second. Count all requests.
            if (shownInWindow++ < 4) {
                put(new Entry(now, "Запрос", "Ресурс · " + domain));
                callback = onChange;
            }
        }
        if (callback != null) callback.run();
    }

    private void add(String type, String description) {
        Runnable callback;
        synchronized (this) {
            if (paused) return;
            put(new Entry(System.currentTimeMillis(), type, description));
            callback = onChange;
        }
        if (callback != null) callback.run();
    }

    private void put(Entry entry) {
        entries.addLast(entry);
        if (entries.size() > LIMIT) entries.removeFirst();
    }

    /** Returns only a validated hostname; query strings, fragments and paths never cross this boundary. */
    static String host(String rawUrl) {
        try {
            URI uri = new URI(rawUrl);
            String scheme = uri.getScheme();
            String host = uri.getHost();
            if (uri.getRawUserInfo() != null || host == null || scheme == null ||
                    !("https".equalsIgnoreCase(scheme) || "http".equalsIgnoreCase(scheme)) ||
                    !host.matches("[a-zA-Z0-9.-]{1,100}")) return "домен скрыт";
            return host.toLowerCase(Locale.ROOT);
        } catch (Exception ignored) { return "домен скрыт"; }
    }
}
