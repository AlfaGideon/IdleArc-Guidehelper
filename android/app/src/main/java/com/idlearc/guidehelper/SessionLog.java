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
    private long operationCount;
    private long operationWindow;
    private int shownOperations;
    private long requestWindow;
    private int shownInWindow;

    synchronized void setOnChange(Runnable callback) { onChange = callback; }
    synchronized boolean isPaused() { return paused; }
    synchronized long requests() { return requestCount; }
    synchronized long operations() { return operationCount; }
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
            operationCount = 0; operationWindow = 0; shownOperations = 0;
            callback = onChange;
        }
        if (callback != null) callback.run();
    }

    // Only call with fixed app-controlled strings (never a URL or page text).
    void event(String type, String description) { add(type, description); }

    void navigation(String action, String url) {
        add("Переход", action + " · " + host(url));
    }

    void request(String url) { request(url, "GET"); }

    void request(String url, String method) {
        String route = safeRoute(url);
        if ("домен скрыт".equals(route)) return;
        String verb = method != null && method.matches("GET|POST|PUT|PATCH|DELETE|HEAD") ? method : "OTHER";
        Runnable callback = null;
        synchronized (this) {
            if (paused) return;
            requestCount++;
            long now = System.currentTimeMillis();
            if (now - requestWindow >= 1000) { requestWindow = now; shownInWindow = 0; }
            // Show at most four individual requests per second. Count all requests.
            if (shownInWindow++ < 4) {
                put(new Entry(now, "Запрос", "Ресурс " + verb + " → " + route));
                callback = onChange;
            }
        }
        if (callback != null) callback.run();
    }

    /** A game control click; text must be a short, non-sensitive accessible label. */
    void click(String tag, String label, int id) {
        String type = "A".equals(tag) ? "Ссылка" : "Кнопка";
        String prefix = id > 0 && id <= 1000000 ? "#" + id + " · " : "";
        add("Нажатие", prefix + type + " · " + safeLabel(label));
    }

    /** fetch/XHR/WebSocket request metadata from the allowlisted game origin. */
    void network(String type, String method, String url, int status, int afterClick) {
        if (!("fetch".equals(type) || "xhr".equals(type) || "ws-tx".equals(type) || "ws-rx".equals(type))) return;
        String route = safeRoute(url);
        if ("домен скрыт".equals(route)) return;
        String verb = method != null && method.matches("GET|POST|PUT|PATCH|DELETE|HEAD") ? method : "OTHER";
        String state = status > 0 && status <= 599 ? " · HTTP " + status : "";
        String kind = type.startsWith("ws-") ? ("ws-tx".equals(type) ? "WS →" : "WS ←") : type.toUpperCase(Locale.ROOT);
        String correlation = afterClick > 0 && afterClick <= 1000000 ? " · ≈ после #" + afterClick : "";
        Runnable callback = null;
        synchronized (this) {
            if (paused) return;
            operationCount++;
            long now = System.currentTimeMillis();
            if (now - operationWindow >= 1000) { operationWindow = now; shownOperations = 0; }
            if (shownOperations++ < 12) {
                put(new Entry(now, "Сеть", kind + " " + verb + " · " + route + state + correlation));
                callback = onChange;
            }
        }
        if (callback != null) callback.run();
    }

    static String safeLabel(String label) {
        if (label == null) return "подпись скрыта";
        String value = label.replaceAll("\\s+", " ").trim();
        if (value.isEmpty() || value.length() > 60 || value.contains("@") || value.matches("(?i).*https?://.*") ||
                value.matches(".*(?:[A-Za-z0-9_-]{20,}|[0-9]{6,}).*") ||
                value.matches("(?i).*(?:token|password|secret|cookie|email|api.key).*"))
            return "подпись скрыта";
        if (!value.matches("[\\p{L}\\p{N} .,_+%!?()/:\\-]{1,60}")) return "подпись скрыта";
        return value;
    }

    static String safeRoute(String rawUrl) {
        try {
            URI uri = new URI(rawUrl);
            String domain = host(rawUrl);
            String scheme = uri.getScheme();
            if ("домен скрыт".equals(domain) && "wss".equalsIgnoreCase(scheme)) {
                // WebSocket destinations also use TLS and may be observed by the JS instrument.
                domain = host(rawUrl.replaceFirst("^wss:", "https:"));
            }
            if ("домен скрыт".equals(domain)) return domain;
            if (!("idlearc.com".equals(domain) || "www.idlearc.com".equals(domain))) return domain;
            String path = uri.getRawPath();
            if (path == null || path.isEmpty() || "/".equals(path)) return domain + "/";
            if (path.matches("(?i).*(?:auth|token|session|password|oauth|login|callback|credential|private).*"))
                return domain + "/[защищённый маршрут]";
            StringBuilder safe = new StringBuilder(domain);
            String[] parts = path.split("/");
            int shown = 0;
            for (String part : parts) {
                if (part.isEmpty()) continue;
                if (shown++ >= 4) { safe.append("/…"); break; }
                safe.append('/');
                if (part.length() > 24 || !part.matches("[A-Za-z][A-Za-z0-9_-]{0,23}") ||
                        part.matches(".*[0-9]{5,}.*")) safe.append(":id");
                else safe.append(part);
            }
            return safe.toString();
        } catch (Exception ignored) { return "домен скрыт"; }
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
