import os
import sys
import re
import subprocess

def main(modo):
    if modo not in ["registrar", "analitica"]:
        print("Modo inválido. Usa 'registrar' o 'analitica'.")
        sys.exit(1)

    app_id = f"com.resumentaquilla.{modo}"
    app_name = "DataPark" if modo == "registrar" else "Data Park Admin"
    
    # Incrementar versión para evitar errores de instalación (Downgrade/Same Version)
    import time
    version_code = int(time.time() / 100) # Un número que siempre crece
    version_name = "1.1." + str(int(time.time()) % 1000)

    print(f"--- PREPARANDO COMPILACIÓN PARA: {app_name.upper()} ---")

    
    # 1. Modificar capacitor.config.ts
    cap_cfg_path = "capacitor.config.ts"
    if os.path.exists(cap_cfg_path):
        with open(cap_cfg_path, "r", encoding="utf-8") as f:
            content = f.read()
        content = re.sub(r"appId:\s*['\"].*?['\"]", f"appId: '{app_id}'", content)
        content = re.sub(r"appName:\s*['\"].*?['\"]", f"appName: '{app_name}'", content)
        with open(cap_cfg_path, "w", encoding="utf-8") as f:
            f.write(content)
        print("✅ capacitor.config.ts actualizado.")

    # 2. Modificar android/app/build.gradle
    build_gradle_path = os.path.join("android", "app", "build.gradle")
    if os.path.exists(build_gradle_path):
        with open(build_gradle_path, "r", encoding="utf-8") as f:
            content = f.read()
        content = re.sub(r'namespace\s*=?\s*["\'].*?["\']', f'namespace = "{app_id}"', content)
        content = re.sub(r'applicationId\s+["\'].*?["\']', f'applicationId "{app_id}"', content)
        content = re.sub(r'versionCode\s+\d+', f'versionCode {version_code}', content)
        content = re.sub(r'versionName\s+["\'].*?["\']', f'versionName "{version_name}"', content)
        with open(build_gradle_path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"✅ android/app/build.gradle actualizado (v{version_name}).")


    # 3. Modificar strings.xml
    strings_xml_path = os.path.join("android", "app", "src", "main", "res", "values", "strings.xml")
    if os.path.exists(strings_xml_path):
        with open(strings_xml_path, "r", encoding="utf-8") as f:
            content = f.read()
        content = re.sub(r'<string name="app_name">.*?</string>', f'<string name="app_name">{app_name}</string>', content)
        content = re.sub(r'<string name="title_activity_main">.*?</string>', f'<string name="title_activity_main">{app_name}</string>', content)
        content = re.sub(r'<string name="package_name">.*?</string>', f'<string name="package_name">{app_id}</string>', content)
        content = re.sub(r'<string name="custom_url_scheme">.*?</string>', f'<string name="custom_url_scheme">{app_id}</string>', content)
        with open(strings_xml_path, "w", encoding="utf-8") as f:
            f.write(content)
        print("✅ strings.xml actualizado.")

    # 4. Modificar AndroidManifest.xml
    manifest_path = os.path.join("android", "app", "src", "main", "AndroidManifest.xml")
    if os.path.exists(manifest_path):
        with open(manifest_path, "r", encoding="utf-8") as f:
            content = f.read()
        # Asegurar que name="MainActivity" no tenga el punto prefijado si queremos que sea dinámico
        content = content.replace('android:name=".MainActivity"', 'android:name="MainActivity"')
        with open(manifest_path, "w", encoding="utf-8") as f:
            f.write(content)
        print("✅ AndroidManifest.xml actualizado.")

    print(f"\n🚀 Compilando la vista '{modo}' para la web...")
    env_vars = os.environ.copy()
    env_vars["NEXT_PUBLIC_APP_MODE"] = modo
    
    try:
        subprocess.run("npx next build", shell=True, check=True, env=env_vars)
    except subprocess.CalledProcessError as e:
        print(f"❌ Error en 'next build': {e}")
        sys.exit(1)
    
    print("\n🔄 Sincronizando el compilado con Android...")
    try:
        subprocess.run("npm run app:sync", shell=True, check=True)
    except subprocess.CalledProcessError as e:
        print(f"❌ Error en 'app:sync': {e}")
        sys.exit(1)

    print("\n📦 Generando APK con Gradle...")
    gradle_cmd = os.path.join("android", "gradlew.bat")
    # Limpiar y compilar para evitar conflictos entre modos
    try:
        subprocess.run(f"{gradle_cmd} clean", shell=True, check=True, cwd="android")
        subprocess.run(f"{gradle_cmd} assembleDebug", shell=True, check=True, cwd="android")
    except subprocess.CalledProcessError as e:
        print(f"❌ Error durante la compilación de Gradle: {e}")
        sys.exit(1)

    # 5. Mover el APK a una carpeta accesible
    output_dir = "apks"
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    source_apk = os.path.join("android", "app", "build", "outputs", "apk", "debug", "app-debug.apk")
    target_apk = os.path.join(output_dir, f"DataPark_{modo}.apk")
    
    if os.path.exists(source_apk):
        import shutil
        shutil.copy2(source_apk, target_apk)
        print(f"\n✅ APK GENERADO: {os.path.abspath(target_apk)}")
    else:
        print(f"❌ No se encontró el APK generado en: {source_apk}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python scripts/generar_apk.py <registrar|analitica>")
        sys.exit(1)
    main(sys.argv[1])
