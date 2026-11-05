package com.idlearc.guidehelper;

import android.content.res.AssetManager;
import android.net.Uri;
import android.webkit.WebView;

import androidx.webkit.WebMessageCompat;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;

import org.json.JSONObject;

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
                        if (raw == null || raw.length() > 400) return;
                        try {
                            JSONObject data = new JSONObject(raw);
                            String type = data.optString("t");
                            if ("click".equals(type)) {
                                log.click(data.optString("tag"), data.optString("label"));
                            } else if ("fetch".equals(type) || "xhr".equals(type) ||
                                    "ws-tx".equals(type) || "ws-rx".equals(type)) {
                                log.network(type, data.optString("m"), data.optString("u"), data.optInt("s", 0));
                            }
                        } catch (Exception ignored) { /* Reject malformed messages from page scripts. */ }
                    });
            WebViewCompat.addDocumentStartJavaScript(web, new String(script, StandardCharsets.UTF_8), ORIGINS);
            return true;
        } catch (Exception e) {
            log.event("Система", "Детальный сбор недоступен на этой версии WebView");
            return false;
        }
    }
}
