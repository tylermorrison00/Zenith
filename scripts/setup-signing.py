import os
import sys
import subprocess

def setup_signing(version_name="1.0.7", version_code=10007):
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    keystore_dir = os.path.join(repo_root, "keystore")
    os.makedirs(keystore_dir, exist_ok=True)
    keystore_path = os.path.join(keystore_dir, "zenith.keystore")
    
    # 1. Generate keystore if not exists
    if not os.path.exists(keystore_path):
        print("Generating persistent Android signing keystore...")
        cmd = [
            "keytool", "-genkeypair", "-v",
            "-keystore", keystore_path,
            "-alias", "zenith",
            "-keyalg", "RSA",
            "-keysize", "2048",
            "-validity", "10000",
            "-storepass", "zenithpass123",
            "-keypass", "zenithpass123",
            "-dname", "CN=Zenith, OU=Mobile, O=Zenith, L=SanFrancisco, S=CA, C=US"
        ]
        try:
            subprocess.check_call(cmd)
            print("Keystore generated successfully at:", keystore_path)
        except Exception as e:
            print("Warning: keytool call failed:", e)
    else:
        print("Keystore already exists at:", keystore_path)

    # 2. Patch android/app/build.gradle
    gradle_path = os.path.join(repo_root, "android", "app", "build.gradle")
    if not os.path.exists(gradle_path):
        print("Warning: android/app/build.gradle not found at:", gradle_path)
        return

    with open(gradle_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Update versionCode and versionName
    import re
    content = re.sub(r'versionCode\s+\d+', f'versionCode {version_code}', content)
    content = re.sub(r'versionName\s+"[^"]+"', f'versionName "{version_name}"', content)

    # Add signingConfigs and wire into both debug and release buildTypes
    signing_and_buildtypes = f"""    signingConfigs {{
        release {{
            storeFile file('../../keystore/zenith.keystore')
            storePassword 'zenithpass123'
            keyAlias 'zenith'
            keyPassword 'zenithpass123'
        }}
    }}
    buildTypes {{
        debug {{
            signingConfig signingConfigs.release
        }}
        release {{
            signingConfig signingConfigs.release"""

    content = re.sub(r'buildTypes\s*\{\s*release\s*\{', signing_and_buildtypes, content)

    with open(gradle_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Patched android/app/build.gradle with persistent signing and version", version_name)

if __name__ == "__main__":
    v_name = sys.argv[1] if len(sys.argv) > 1 else "1.0.7"
    v_code = int(sys.argv[2]) if len(sys.argv) > 2 else 10007
    setup_signing(v_name, v_code)
