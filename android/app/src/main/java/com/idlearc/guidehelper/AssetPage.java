package com.idlearc.guidehelper;

import android.content.res.AssetManager;
import android.webkit.WebResourceResponse;
import java.io.IOException;
import java.util.Locale;

/** Serves bundled Companion files under an HTTPS origin, without exposing file:// access. */
final class AssetPage {
    static final String ORIGIN = "https://appassets.androidplatform.net";
    static final String HOME = ORIGIN + "/companion/index.html";

    static WebResourceResponse open(AssetManager assets, String url) {
        android.net.Uri uri = android.net.Uri.parse(url);
        if (!"https".equals(uri.getScheme()) || !"appassets.androidplatform.net".equals(uri.getHost())
                || uri.getPort() != -1 || uri.getEncodedQuery() != null || uri.getEncodedFragment() != null) return null;
        String path = uri.getEncodedPath();
        if (path == null || !path.startsWith("/companion/") || path.contains("%") || path.contains("\\") || path.contains(".."))
            return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", java.util.Collections.emptyMap(), new java.io.ByteArrayInputStream(new byte[0]));
        String file = path.substring(1);
        String lower = file.toLowerCase(Locale.ROOT);
        String mime = lower.endsWith(".html") ? "text/html" : lower.endsWith(".js") ? "application/javascript"
                : lower.endsWith(".css") ? "text/css" : lower.endsWith(".json") ? "application/json"
                : lower.endsWith(".png") ? "image/png" : lower.endsWith(".svg") ? "image/svg+xml" : "text/plain";
        try {
            return new WebResourceResponse(mime, "UTF-8", assets.open(file));
        } catch (IOException e) {
            return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", java.util.Collections.emptyMap(), new java.io.ByteArrayInputStream(new byte[0]));
        }
    }
}
