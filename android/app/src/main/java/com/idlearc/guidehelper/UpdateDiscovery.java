package com.idlearc.guidehelper;

import java.net.URI;

/** Public GitHub release URLs; never accepts an arbitrary download host from metadata. */
final class UpdateDiscovery {
    static final String ROOT = "https://github.com/AlfaGideon/IdleArc-Guidehelper";
    static final String LATEST = ROOT + "/releases/latest";
    static final String MANIFEST = LATEST + "/download/update.json";
    private UpdateDiscovery() {}

    static String tagFromRedirect(String location) {
        try {
            URI uri = new URI(location);
            String prefix = "/AlfaGideon/IdleArc-Guidehelper/releases/tag/";
            if (!"https".equals(uri.getScheme()) || !"github.com".equals(uri.getHost()) ||
                    uri.getPort() != -1 || uri.getRawQuery() != null || uri.getRawFragment() != null ||
                    !uri.getPath().startsWith(prefix)) return null;
            String tag = uri.getPath().substring(prefix.length());
            return tag.matches("v[0-9]+\\.[0-9]+\\.[0-9]+") ? tag : null;
        } catch (Exception ignored) { return null; }
    }
    static String apkUrl(String tag) {
        if (tag == null || !tag.matches("v[0-9]+\\.[0-9]+\\.[0-9]+")) return null;
        return ROOT + "/releases/download/" + tag + "/IdleArc-Guide.apk";
    }
}
