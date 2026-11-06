package com.idlearc.guidehelper;

import android.content.res.AssetManager;
import android.webkit.WebView;

import androidx.webkit.WebMessageCompat;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;

import org.json.JSONObject;
import org.json.JSONArray;
import java.util.ArrayList;
import java.util.List;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

/** Origin-restricted telemetry for our in-app game WebView; never offered to auth providers. */
final class DetailedCapture {
    private static final Set<String> ORIGINS = new HashSet<>(Arrays.asList("https://idlearc.com", "https://www.idlearc.com"));
    private DetailedCapture() {}

    static boolean install(WebView web, AssetManager assets, SessionLog log) {
        if (!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER) ||
                !WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) return false;
        try {
            byte[] script;
            try (InputStream in = assets.open("game-probe.js"); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                byte[] buffer = new byte[8192]; int n;
                while ((n = in.read(buffer)) != -1) out.write(buffer, 0, n);
                script = out.toByteArray();
            }
            WebViewCompat.addWebMessageListener(web, "IdleArcTelemetry", ORIGINS,
                    (view, message, origin, isMainFrame, replyProxy) -> {
                        if (view != web || !isMainFrame || origin == null || !ORIGINS.contains(origin.toString()) ||
                                message.getType() != WebMessageCompat.TYPE_STRING) return;
                        String raw = message.getData();
                        if (raw == null || raw.length() > 2400) return;
                        try {
                            JSONObject data = new JSONObject(raw);
                            String type = data.optString("t");
                            if ("click".equals(type)) {
                                log.click(data.optString("tag"), data.optString("label"), data.optInt("id", 0));
                            } else if ("fetch".equals(type) || "xhr".equals(type) ||
                                    "ws-tx".equals(type) || "ws-rx".equals(type)) {
                                log.network(type, data.optString("m"), data.optString("u"), data.optInt("s", 0),
                                        data.optInt("a", 0), data.optString("p"));
                            } else if ("fields".equals(type)) {
                                log.gameFields(data.optString("u"), data.optString("d"),
                                        data.optString("action"), data.optString("currency"), data.opt("amount"),
                                        data.optString("entity"), data.optString("name"));
                            } else if ("audit".equals(type)) {
                                String url = data.optString("u");
                                if ("balance".equals(data.optString("k"))) {
                                    JSONObject values = data.optJSONObject("v");
                                    if (values != null && values.length() <= 5) {
                                        for (String field : new String[]{"gold", "gems", "rubies", "essence", "experience"})
                                            if (values.has(field)) log.observeBalance(url, field, values.opt(field));
                                    }
                                } else if ("achievement".equals(data.optString("k"))) {
                                    log.observeAchievement(url, data.optString("name"), data.optString("event"));
                                } else if ("mismatch".equals(data.optString("k"))) {
                                    log.observeEventMismatch(url, data.optString("name"),
                                            data.optString("event"), data.optString("sourceEvent"));
                                }
                            } else if ("items".equals(type)) {
                                JSONArray list = data.optJSONArray("list");
                                if (list == null || list.length() == 0 || list.length() > 6) return;
                                List<String> items = new ArrayList<>();
                                for (int i = 0; i < list.length(); i++) {
                                    JSONObject item = list.optJSONObject(i);
                                    if (item == null) return;
                                    String detail = GameText.item(item.optString("name"), item.optString("rarity"),
                                            item.opt("qty"), item.opt("level"), item.opt("attack"),
                                            item.opt("defense"), item.opt("hp"), item.opt("strength"),
                                            item.opt("dexterity"), item.opt("intelligence"), item.opt("crit"));
                                    if (detail == null) return;
                                    items.add(detail);
                                }
                                log.itemDetails(data.optString("u"), data.optString("d"),
                                        data.optInt("n", 0), items);
                            }
                        } catch (Exception ignored) { /* Reject malformed messages from page scripts. */ }
                    });
            WebViewCompat.addDocumentStartJavaScript(web, new String(script, StandardCharsets.UTF_8), ORIGINS);
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}
