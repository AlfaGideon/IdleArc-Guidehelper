package com.idlearc.guidehelper;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.widget.Button;

import androidx.core.content.FileProvider;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.concurrent.Executors;
import java.util.function.Consumer;

/** User-initiated GitHub Releases check. Android itself verifies the APK signature on install. */
final class UpdateManager {
    private static final String REPO = "AlfaGideon/IdleArc-Guidehelper";
    private static final String API = "https://api.github.com/repos/" + REPO + "/releases/latest";
    private static final String APK = "IdleArc-Guide.apk";
    private static final int MAX_APK = 100 * 1024 * 1024;
    private static final java.util.concurrent.ExecutorService IO = Executors.newSingleThreadExecutor();
    private static final Handler UI = new Handler(Looper.getMainLooper());
    private UpdateManager() {}

    static void check(Activity activity, Button button, Consumer<String> logger) {
        button.setEnabled(false);
        button.setText("Поиск…");
        IO.execute(() -> {
            try {
                logger.accept("Проверка версии · api.github.com");
                HttpURLConnection conn = connect(API);
                int code = conn.getResponseCode();
                logger.accept("Ответ GitHub · HTTP " + code);
                if (code == 404) throw new Exception("Пока нет опубликованного стабильного релиза GitHub.");
                if (code != 200) throw new Exception("GitHub ответил кодом " + code + ". Попробуйте позже.");
                JSONObject release = new JSONObject(new String(readLimit(conn.getInputStream(), 256 * 1024), java.nio.charset.StandardCharsets.UTF_8));
                String tag = release.optString("tag_name");
                String installed = activity.getPackageManager().getPackageInfo(activity.getPackageName(), 0).versionName;
                if (compare(tag, installed) <= 0) {
                    logger.accept("Актуальная версия установлена");
                    message(activity, button, "Обновлений нет", "Установлена версия " + installed + ". Последний релиз: " + tag + ".");
                    return;
                }
                JSONArray assets = release.optJSONArray("assets");
                JSONObject asset = null;
                for (int i = 0; assets != null && i < assets.length(); i++) {
                    JSONObject item = assets.optJSONObject(i);
                    if (item != null && APK.equals(item.optString("name"))) { asset = item; break; }
                }
                if (asset == null) throw new Exception("В релизе " + tag + " нет файла " + APK + ".");
                String url = asset.getString("browser_download_url");
                String digest = asset.optString("digest");
                if (!url.startsWith("https://github.com/" + REPO + "/releases/download/") ||
                        !url.endsWith("/" + APK) || !digest.matches("sha256:[0-9a-fA-F]{64}"))
                    throw new Exception("У релиза нет проверяемого APK с SHA-256.");
                String finalUrl = url;
                String hash = digest.substring(7).toLowerCase(java.util.Locale.ROOT);
                UI.post(() -> {
                    if (activity.isFinishing()) return;
                    button.setText("↻ APK"); button.setEnabled(true);
                    new AlertDialog.Builder(activity).setTitle("Версия " + tag)
                            .setMessage("Загрузить подписанное обновление с GitHub? Установка потребует подтверждения Android. Данные игры и справочника сохранятся только при совпадении подписи APK.")
                            .setNegativeButton("Отмена", null)
                            .setPositiveButton("Загрузить", (dialog, which) -> download(activity, button, finalUrl, hash, logger))
                            .show();
                });
            } catch (Exception e) { logger.accept("Не удалось проверить обновление"); message(activity, button, "Обновление недоступно", e.getMessage()); }
        });
    }

    private static void download(Activity activity, Button button, String url, String sha256, Consumer<String> logger) {
        button.setEnabled(false);
        button.setText("Загрузка…");
        IO.execute(() -> {
            File folder = new File(activity.getCacheDir(), "updates");
            File temp = new File(folder, "incoming.tmp");
            File apk = new File(folder, APK);
            try {
                if (!folder.exists() && !folder.mkdirs()) throw new Exception("Не удалось создать папку обновления.");
                logger.accept("Загрузка APK · github.com");
                HttpURLConnection conn = connect(url);
                if (conn.getResponseCode() != 200) throw new Exception("Не удалось скачать APK: HTTP " + conn.getResponseCode());
                MessageDigest md = MessageDigest.getInstance("SHA-256");
                long size = 0;
                try (InputStream in = conn.getInputStream(); FileOutputStream out = new FileOutputStream(temp)) {
                    byte[] buffer = new byte[16384];
                    int n;
                    while ((n = in.read(buffer)) != -1) {
                        size += n;
                        if (size > MAX_APK) throw new Exception("APK превышает лимит 100 МБ.");
                        md.update(buffer, 0, n);
                        out.write(buffer, 0, n);
                    }
                }
                StringBuilder actual = new StringBuilder();
                for (byte b : md.digest()) actual.append(String.format(java.util.Locale.ROOT, "%02x", b & 0xff));
                if (size == 0 || !actual.toString().equals(sha256)) throw new Exception("Контрольная сумма APK не совпала.");
                logger.accept("SHA-256 APK проверена");
                if (apk.exists() && !apk.delete() || !temp.renameTo(apk)) throw new Exception("Не удалось сохранить APK.");
                UI.post(() -> {
                    if (activity.isFinishing()) return;
                    button.setText("↻ APK"); button.setEnabled(true);
                    if (Build.VERSION.SDK_INT >= 26 && !activity.getPackageManager().canRequestPackageInstalls()) {
                        logger.accept("Нужно разрешение на установку APK");
                        new AlertDialog.Builder(activity).setTitle("Разрешение Android")
                                .setMessage("Разрешите установку из этого приложения, затем снова нажмите «↻ APK». Загруженный APK останется в кэше до очистки данных приложения.")
                                .setPositiveButton("Настройки", (d, w) -> activity.startActivity(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                                        Uri.parse("package:" + activity.getPackageName()))))
                                .setNegativeButton("Отмена", null).show();
                        return;
                    }
                    Uri uri = FileProvider.getUriForFile(activity, activity.getPackageName() + ".updates", apk);
                    Intent intent = new Intent(Intent.ACTION_VIEW).setDataAndType(uri, "application/vnd.android.package-archive")
                            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    try { activity.startActivity(intent); logger.accept("Открыт системный установщик APK"); }
                    catch (Exception e) { message(activity, button, "Установка", "Не найден установщик APK на устройстве."); }
                });
            } catch (Exception e) {
                temp.delete();
                logger.accept("Загрузка APK завершилась ошибкой");
                message(activity, button, "Ошибка загрузки", e.getMessage());
            }
        });
    }

    private static HttpURLConnection connect(String url) throws Exception {
        for (int redirects = 0; redirects <= 5; redirects++) {
            URL target = new URL(url);
            if (!"https".equals(target.getProtocol())) throw new Exception("Небезопасный адрес обновления.");
            HttpURLConnection conn = (HttpURLConnection) target.openConnection();
            conn.setConnectTimeout(10000); conn.setReadTimeout(20000);
            conn.setInstanceFollowRedirects(false);
            conn.setRequestProperty("User-Agent", "IdleArc-Guide-Android");
            conn.setRequestProperty("Accept", "application/vnd.github+json");
            int code = conn.getResponseCode();
            if (code == 301 || code == 302 || code == 303 || code == 307 || code == 308) {
                String next = conn.getHeaderField("Location"); conn.disconnect();
                if (next == null) throw new Exception("Некорректный редирект GitHub.");
                url = new URL(target, next).toString();
            } else return conn;
        }
        throw new Exception("Слишком много перенаправлений.");
    }

    private static byte[] readLimit(InputStream in, int max) throws Exception {
        try (InputStream input = in; ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[8192]; int n;
            while ((n = input.read(buffer)) != -1) {
                if (out.size() + n > max) throw new Exception("Ответ GitHub слишком большой.");
                out.write(buffer, 0, n);
            }
            return out.toByteArray();
        }
    }

    private static int compare(String tag, String installed) throws Exception {
        if (!tag.matches("v[0-9]+\\.[0-9]+\\.[0-9]+") || !installed.matches("[0-9]+\\.[0-9]+\\.[0-9]+"))
            throw new Exception("Неизвестный формат версии релиза.");
        String[] a = tag.substring(1).split("\\."), b = installed.split("\\.");
        for (int i = 0; i < 3; i++) {
            int diff = Integer.compare(Integer.parseInt(a[i]), Integer.parseInt(b[i]));
            if (diff != 0) return diff;
        }
        return 0;
    }

    private static void message(Activity activity, Button button, String title, String body) {
        UI.post(() -> {
            if (activity.isFinishing()) return;
            button.setText("↻ APK"); button.setEnabled(true);
            new AlertDialog.Builder(activity).setTitle(title).setMessage(body).setPositiveButton("Понятно", null).show();
        });
    }
}
