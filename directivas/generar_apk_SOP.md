# Directiva SOP: Generación de APKs Independientes

## Objetivo
Automatizar el cambio de configuraciones (`appId` y `appName`) antes de compilar para poder generar y tener instaladas simultáneamente las dos aplicaciones ("Registrar" y "Analítica") en el mismo dispositivo Android.

## Lógica Principal
1.  **Entrada:** El script recibe como argumento el modo deseado (`registrar` o `analitica`).
2.  **Modificación de Identificadores:**
    - Se modifica `capacitor.config.ts` (appId y appName).
    - Se modifica `android/app/build.gradle` (namespace y applicationId).
    - Se modifica `android/app/src/main/res/values/strings.xml` (app_name, package_name, etc).
3.  **Compilación Web:** Se ejecuta el comando `npm run build:<modo>`.
4.  **Sincronización:** Se sincroniza con Capacitor mediante `npm run app:sync`.
5.  **Aviso:** Se informa al usuario que el proyecto Android ya está listo para ser abierto en Android Studio y generar el APK.

## Variables por Modo
- **Modo Registrar:**
  - `appId` de Android: `com.resumentaquilla.registrar`
  - Nombre Visible: `Registrar`
- **Modo Analitica:**
  - `appId` de Android: `com.resumentaquilla.analitica`
  - Nombre Visible: `Analítica`

## Restricciones y Casos Borde
- Sustitución Exacta: Para no romper los archivos, las sustituciones deben usar expresiones regulares (Regex) sólidas que coincidan con las claves independientemente del valor anterior.
- Evitar Cachés: Tras cambiar el `appId`, es buena idea hacer la sincronización antes de abrir Android Studio para evitar errores.

## Pasos de Ejecución
1. Correr el script en la ruta del proyecto: `python scripts/generar_apk.py <modo>`
2. Realizar la compilación desde Android Studio.
