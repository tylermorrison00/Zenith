import os
import re

print("Starting setup-updater-plugin.py...")

manifest_path = "android/app/src/main/AndroidManifest.xml"
if os.path.exists(manifest_path):
    with open(manifest_path, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Add REQUEST_INSTALL_PACKAGES permission
    if "REQUEST_INSTALL_PACKAGES" not in content:
        content = content.replace(
            '<uses-permission android:name="android.permission.INTERNET" />',
            '<uses-permission android:name="android.permission.INTERNET" />\n    <uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES" />\n    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="28" />'
        )

    # 2. Add FileProvider inside <application>
    if "fileprovider" not in content:
        provider_xml = '''
        <provider
            android:name="androidx.core.content.FileProvider"
            android:authorities="${applicationId}.fileprovider"
            android:exported="false"
            android:grantUriPermissions="true">
            <meta-data
                android:name="android.support.FILE_PROVIDER_PATHS"
                android:resource="@xml/file_paths" />
        </provider>
    </application>'''
        content = content.replace("</application>", provider_xml)

    with open(manifest_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Updated AndroidManifest.xml successfully!")

# 3. Create res/xml/file_paths.xml
xml_dir = "android/app/src/main/res/xml"
os.makedirs(xml_dir, exist_ok=True)
file_paths_path = os.path.join(xml_dir, "file_paths.xml")
with open(file_paths_path, "w", encoding="utf-8") as f:
    f.write('''<?xml version="1.0" encoding="utf-8"?>
<paths>
    <external-cache-path name="external_cache" path="." />
    <external-files-path name="external_files" path="." />
    <cache-path name="internal_cache" path="." />
    <files-path name="internal_files" path="." />
</paths>
''')
print("Created file_paths.xml successfully!")

# 4. Create ApkUpdaterPlugin.java
java_dir = "android/app/src/main/java/com/tylermorrison/zenith"
os.makedirs(java_dir, exist_ok=True)
plugin_path = os.path.join(java_dir, "ApkUpdaterPlugin.java")
with open(plugin_path, "w", encoding="utf-8") as f:
    f.write('''package com.tylermorrison.zenith;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

@CapacitorPlugin(name = "ApkUpdater")
public class ApkUpdaterPlugin extends Plugin {

    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        String downloadUrl = call.getString("url");
        if (downloadUrl == null || downloadUrl.isEmpty()) {
            call.reject("URL is required");
            return;
        }

        new Thread(() -> {
            try {
                Context context = getContext();
                File cacheDir = context.getExternalCacheDir() != null ? context.getExternalCacheDir() : context.getCacheDir();
                File apkFile = new File(cacheDir, "zenith-update.apk");
                if (apkFile.exists()) {
                    apkFile.delete();
                }

                URL url = new URL(downloadUrl);
                HttpURLConnection connection = (HttpURLConnection) url.openConnection();
                connection.setInstanceFollowRedirects(true);
                connection.setRequestProperty("User-Agent", "Zenith-Android");
                connection.connect();

                int status = connection.getResponseCode();
                if (status == HttpURLConnection.HTTP_MOVED_TEMP || status == HttpURLConnection.HTTP_MOVED_PERM || status == 307 || status == 308) {
                    String newUrl = connection.getHeaderField("Location");
                    connection = (HttpURLConnection) new URL(newUrl).openConnection();
                    connection.setRequestProperty("User-Agent", "Zenith-Android");
                    connection.connect();
                }

                int fileLength = connection.getContentLength();
                InputStream input = connection.getInputStream();
                FileOutputStream output = new FileOutputStream(apkFile);

                byte[] data = new byte[8192];
                long total = 0;
                int count;
                long lastReport = 0;

                while ((count = input.read(data)) != -1) {
                    total += count;
                    output.write(data, 0, count);

                    long now = System.currentTimeMillis();
                    if (now - lastReport > 250 || total == fileLength) {
                        lastReport = now;
                        int percent = fileLength > 0 ? (int) (total * 100 / fileLength) : 0;
                        JSObject progressData = new JSObject();
                        progressData.put("percent", percent);
                        progressData.put("received", total);
                        progressData.put("total", fileLength > 0 ? fileLength : total);
                        notifyListeners("downloadProgress", progressData);
                    }
                }

                output.flush();
                output.close();
                input.close();

                Uri apkUri;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                    apkUri = FileProvider.getUriForFile(context, context.getPackageName() + ".fileprovider", apkFile);
                } else {
                    apkUri = Uri.fromFile(apkFile);
                }

                Intent intent = new Intent(Intent.ACTION_VIEW);
                intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);

                JSObject result = new JSObject();
                result.put("success", true);
                call.resolve(result);

            } catch (Exception e) {
                call.reject("Download or install error: " + e.getMessage(), e);
            }
        }).start();
    }
}
''')
print("Created ApkUpdaterPlugin.java successfully!")

# 5. Update MainActivity.java
main_activity_path = os.path.join(java_dir, "MainActivity.java")
with open(main_activity_path, "w", encoding="utf-8") as f:
    f.write('''package com.tylermorrison.zenith;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ApkUpdaterPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
''')
print("Updated MainActivity.java successfully!")
