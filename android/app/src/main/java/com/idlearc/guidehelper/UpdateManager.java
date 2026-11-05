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

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.concurrent.Executors;

/** User-initiated GitHub Releases check. Android itself verifies the APK signature on install. */
final class UpdateManager {
    private static final String APK = "IdleArc-Guide.apk";
    private static final int MAX_APK = 100 * 1024 * 1024;
    private static final java.util.concurrent.ExecutorService IO = Executors.newSingleThreadExecutor();
    private static final Handler UI = new Handler(Looper.getMainLooper());
    private UpdateManager() {}

    static void check(Activity activity, Button button) {
        button.setEnabled(false);
        button.setText("Поиск…");
        IO.execute(() -> {
            try {
                // Prefer an inexpensive public release asset; no API token or rate limit required.
                String tag;
                String hash = null;
                String url;
                HttpURLConnection manifest = connect(UpdateDiscovery.MANIFEST);
                if (manifest.getResponseCode() == 200) {
                    JSONObject data = new JSONObject(new String(readLimit(manifest.getInputStream(), 8192), java.nio.charset.StandardCharsets.UTF_8));
                    tag = data.optString("version");
                    url = UpdateDiscovery.apkUrl(tag);
                    hash = data.optString("sha256");
                    if (url == null || !url.equals(data.optString("apk")) || !hash.matches("[0-9a-fA-F]{64}"))
                        throw new Exception("Некорректные данные релиза GitHub.");
                } else if (manifest.getResponseCode() == 403 || manifest.getResponseCode() == 404) {
                    // GitHub assets/API may be denied or rate-limited for this network.
                    // The public /releases/latest page redirects to a versioned release.
                    tag = latestTagFromPage();
                    url = UpdateDiscovery.apkUrl(tag);
                    if (url == null) throw new Exception("Не удалось определить версию GitHub. Откройте релиз вручную.");
                } else {
                    throw new Exception("GitHub не отдал информацию об обновлении (код " + manifest.getResponseCode() + ").");
                }
                String installed = activity.getPackageManager().getPackageInfo(activity.getPackageName(), 0).versionName;
                if (compare(tag, installed) <= 0) {
                    message(activity, button, "Обновлений нет", "Установлена версия " + installed + ". Последний релиз: " + tag + ".");
                    return;
                }
                String finalUrl = url;
                String finalHash = hash;
                UI.post(() -> {
                    if (activity.isFinishing()) return;
                    button.setText("↻ APK"); button.setEnabled(true);
                    new AlertDialog.Builder(activity).setTitle("Версия " + tag)
                            .setMessage("Загрузить подписанное обновление с GitHub? Установка потребует подтверждения Android. Данные игры и справочника сохранятся только при совпадении подписи APK.")
                            .setNegativeButton("Отмена", null)
                            .setPositiveButton("Загрузить", (dialog, which) -> download(activity, button, finalUrl, finalHash))
                            .show();
                });
            } catch (Exception e) { message(activity, button, "Обновление недоступно", e.getMessage()); }
        });
    }

    private static void download(Activity activity, Button button, String url, String sha256) {
        button.setEnabled(false);
        button.setText("Загрузка…");
        IO.execute(() -> {
            File folder = new File(activity.getCacheDir(), "updates");
            File temp = new File(folder, "incoming.apk");
            File apk = new File(folder, APK);
            try {
                if (!folder.exists() && !folder.mkdirs()) throw new Exception("Не удалось создать папку обновления.");
                HttpURLConnection conn = connect(url);
                if (conn.getResponseCode() != 200) throw new Exception("GitHub не отдал APK (код " + conn.getResponseCode()
                        + "). Откройте страницу релиза в браузере и установите файл вручную.");
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
                if (size == 0 || (sha256 != null && !actual.toString().equalsIgnoreCase(sha256)))
                    throw new Exception("Контрольная сумма APK не совпала.");
                // Even without update.json, pin the actual APK to the installed app's signer.
                verifyPackage(activity, temp);
                if (apk.exists() && !apk.delete() || !temp.renameTo(apk)) throw new Exception("Не удалось сохранить APK.");
                UI.post(() -> {
                    if (activity.isFinishing()) return;
                    button.setText("↻ APK"); button.setEnabled(true);
                    if (Build.VERSION.SDK_INT >= 26 && !activity.getPackageManager().canRequestPackageInstalls()) {
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
                    try { activity.startActivity(intent); }
                    catch (Exception e) { message(activity, button, "Установка", "Не найден установщик APK на устройстве."); }
                });
            } catch (Exception e) {
                temp.delete();
                message(activity, button, "Ошибка загрузки", e.getMessage());
            }
        });
    }

    private static String latestTagFromPage() throws Exception {
        HttpURLConnection conn = (HttpURLConnection) new URL(UpdateDiscovery.LATEST).openConnection();
        conn.setInstanceFollowRedirects(false);
        conn.setConnectTimeout(10000); conn.setReadTimeout(20000);
        conn.setRequestProperty("User-Agent", "IdleArc-Guide-Android");
        int code = conn.getResponseCode();
        if (code != 301 && code != 302 && code != 303) throw new Exception("Страница релиза недоступна (код " + code + ").");
        String tag = UpdateDiscovery.tagFromRedirect(conn.getHeaderField("Location"));
        conn.disconnect();
        return tag;
    }

    private static void verifyPackage(Activity activity, File apk) throws Exception {
        android.content.pm.PackageManager pm = activity.getPackageManager();
        int flag = Build.VERSION.SDK_INT >= 28 ? android.content.pm.PackageManager.GET_SIGNING_CERTIFICATES
                : android.content.pm.PackageManager.GET_SIGNATURES;
        android.content.pm.PackageInfo incoming = pm.getPackageArchiveInfo(apk.getAbsolutePath(), flag);
        android.content.pm.PackageInfo installed = pm.getPackageInfo(activity.getPackageName(), flag);
        if (incoming == null || !activity.getPackageName().equals(incoming.packageName))
            throw new Exception("Файл не является обновлением этого приложения.");
        long incomingCode = Build.VERSION.SDK_INT >= 28 ? incoming.getLongVersionCode() : incoming.versionCode;
        long installedCode = Build.VERSION.SDK_INT >= 28 ? installed.getLongVersionCode() : installed.versionCode;
        if (incomingCode <= installedCode) throw new Exception("Версия файла не новее установленной.");
        android.content.pm.Signature[] a = Build.VERSION.SDK_INT >= 28 ? incoming.signingInfo.getApkContentsSigners() : incoming.signatures;
        android.content.pm.Signature[] b = Build.VERSION.SDK_INT >= 28 ? installed.signingInfo.getApkContentsSigners() : installed.signatures;
        if (a == null || b == null || a.length != 1 || b.length != 1 || !a[0].equals(b[0]))
            throw new Exception("Подпись APK отличается от установленного приложения.");
    }

    private static HttpURLConnection connect(String url) throws Exception {
        for (int redirects = 0; redirects <= 5; redirects++) {
            URL target = new URL(url);
            if (!"https".equals(target.getProtocol())) throw new Exception("Небезопасный адрес обновления.");
            HttpURLConnection conn = (HttpURLConnection) target.openConnection();
            conn.setConnectTimeout(10000); conn.setReadTimeout(20000);
            conn.setInstanceFollowRedirects(false);
            conn.setRequestProperty("User-Agent", "IdleArc-Guide-Android");
            conn.setRequestProperty("Accept", "application/octet-stream, application/json");
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
