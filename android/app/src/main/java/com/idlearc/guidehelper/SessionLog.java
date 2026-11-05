package com.idlearc.guidehelper;

import java.net.URI;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/** Game-only, in-memory journal. No app navigation, external domains or raw request content. */
final class SessionLog {
    static final int LIMIT = 300;
    static final class Entry {
        final long time;
        final String type;
        final String description;
        Entry(long time, String type, String description) {
            this.time = time; this.type = type; this.description = description;
        }
    }
    private final ArrayDeque<Entry> entries = new ArrayDeque<>();
    private Runnable onChange;
    private boolean paused;
    private long actionCount;
    private long operationCount;
    private long operationWindow;
    private int shownOperations;

    synchronized void setOnChange(Runnable callback) { onChange = callback; }
    synchronized boolean isPaused() { return paused; }
    synchronized long actions() { return actionCount; }
    synchronized long operations() { return operationCount; }
    synchronized List<Entry> snapshot() { return new ArrayList<>(entries); }

    void setPaused(boolean value) {
        Runnable callback;
        synchronized (this) { paused = value; callback = onChange; }
        if (callback != null) callback.run();
    }
    void clear() {
        Runnable callback;
        synchronized (this) {
            entries.clear(); actionCount = 0; operationCount = 0;
            operationWindow = 0; shownOperations = 0; callback = onChange;
        }
        if (callback != null) callback.run();
    }

    void click(String tag, String label, int id) {
        String type = "A".equals(tag) ? "ссылка" : "кнопка";
        String title = GameText.button(safeLabel(label));
        String number = id > 0 && id <= 1000000 ? " №" + id : "";
        add(true, "В игре", "Вы нажали: " + type + " «" + title + "»" + number);
    }

    void network(String type, String method, String url, int status, int afterClick) {
        if (!("fetch".equals(type) || "xhr".equals(type) || "ws-tx".equals(type) || "ws-rx".equals(type))) return;
        String route = safeRoute(url);
        if (route == null) return;
        String text;
        if ("ws-tx".equals(type)) text = "Игра отправила сообщение серверу (содержимое скрыто)";
        else if ("ws-rx".equals(type)) text = "Игра получила сообщение сервера (содержимое скрыто)";
        else {
            String topic = GameText.topic(route);
            String action = "GET".equals(method) && status >= 200 && status < 300 ? "получила данные" :
                    ("POST".equals(method) || "PUT".equals(method) || "PATCH".equals(method) || "DELETE".equals(method))
                            ? "отправила данные" : "запросила данные";
            text = "Игра " + action + ": " + topic + " — " + GameText.result(status);
            if (status > 0 && status <= 599) text += " (код " + status + ")";
            if (status >= 200 && status < 300 && (topic.contains("предмет") || topic.contains("инвентарь")))
                text += ". Код ответа не раскрывает состав предметов; сведения появятся отдельно, если игра передала читаемый JSON";
        }
        if (afterClick > 0 && afterClick <= 1000000)
            text += " · после действия №" + afterClick + " (по времени)";
        Runnable callback = null;
        synchronized (this) {
            if (paused) return;
            operationCount++;
            long now = System.currentTimeMillis();
            if (now - operationWindow >= 1000) { operationWindow = now; shownOperations = 0; }
            if (shownOperations++ < 12) {
                put(new Entry(now, "Обмен с игрой", text)); callback = onChange;
            }
        }
        if (callback != null) callback.run();
    }

    /** Actual fields observed in a readable game JSON payload; no inferred item identity. */
    void itemDetails(String url, String direction, int total, List<String> items) {
        String route = safeRoute(url);
        if (route == null || !route.matches("(?i).*(?:item|inventory|loot|equip|reward|drop).*") ||
                !("in".equals(direction) || "out".equals(direction)) || total < 1 || total > 999 ||
                items == null || items.isEmpty() || items.size() > 3 || items.size() > total) return;
        String text = "out".equals(direction) ? "В игровом запросе указаны предметы" : "В ответе игры указаны предметы";
        text += " (" + (total > items.size() ? "показаны " + items.size() + " из " + total : total) + "): "
                + String.join("; ", items);
        add(false, "Предметы игры", text);
    }

    void gameError(String message, String url) {
        if (safeRoute(url) != null) add(false, "Ошибка игры", message);
    }

    private void add(boolean click, String type, String description) {
        Runnable callback;
        synchronized (this) {
            if (paused) return;
            if (click) actionCount++;
            put(new Entry(System.currentTimeMillis(), type, description)); callback = onChange;
        }
        if (callback != null) callback.run();
    }
    private void put(Entry entry) {
        entries.addLast(entry);
        if (entries.size() > LIMIT) entries.removeFirst();
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

    /** Return only a safe game route; external domains and credential-bearing paths are discarded. */
    static String safeRoute(String rawUrl) {
        try {
            URI uri = new URI(rawUrl);
            String scheme = uri.getScheme(), host = uri.getHost();
            if (uri.getRawUserInfo() != null || host == null || scheme == null ||
                    !("https".equalsIgnoreCase(scheme) || "wss".equalsIgnoreCase(scheme)) ||
                    !isGameHost(host)) return null;
            String path = uri.getRawPath();
            if (path == null || path.isEmpty() || "/".equals(path)) return "/";
            if (path.matches("(?i).*(?:auth|token|session|password|oauth|login|callback|credential|private).*"))
                return null;
            StringBuilder safe = new StringBuilder();
            String[] parts = path.split("/");
            int shown = 0;
            for (String part : parts) {
                if (part.isEmpty()) continue;
                if (shown++ >= 4) break;
                safe.append('/');
                if (part.length() > 24 || !part.matches("[A-Za-z][A-Za-z0-9_-]{0,23}") ||
                        part.matches(".*[0-9]{5,}.*")) safe.append(":id");
                else safe.append(part);
            }
            return safe.length() == 0 ? "/" : safe.toString();
        } catch (Exception ignored) { return null; }
    }
    static boolean isGameHost(String host) {
        String value = host == null ? "" : host.toLowerCase(Locale.ROOT);
        return value.equals("idlearc.com") || value.endsWith(".idlearc.com");
    }
}
