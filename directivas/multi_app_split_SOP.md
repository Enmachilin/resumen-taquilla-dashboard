# Directiva SOP: División Multi-App (APK)

## Objetivo
Permitir la generación de dos aplicaciones independientes (Registrar y Analítica) desde una única base de código, asegurando que ninguna tenga acceso a la interfaz de la otra.

## Lógica Principal
1.  **Variable de Entorno:** Usar `NEXT_PUBLIC_APP_MODE` para determinar el comportamiento en tiempo de compilación.
    - `registrar`: Solo muestra el formulario de registro.
    - `analitica`: Solo muestra el dashboard de comparativa.
    - `full` (vacío): Comportamiento actual de dashboard completo (por defecto).

2.  **Aislamiento de Interfaz:**
    - En `src/app/page.tsx`, la lógica debe renderizar *exclusivamente* el componente correspondiente si la variable está definida.
    - El "Switcher" o navegación entre pestañas debe ocultarse completamente si no estamos en modo `full`.

3.  **Scripts de Construcción:**
    - `npm run build:registrar`: Ejecuta `next build` con la flag de registro.
    - `npm run build:analitica`: Ejecuta `next build` con la flag de analítica.

## Restricciones y Casos Borde
- **Seguridad:** El código de la otra vista no se renderiza si el modo está activo, evitando navegación accidental.
- **Persistencia:** Asegurarse de que el modo elegido no afecte la persistencia de Firestore.
- **Fallback:** Si no se define la variable, la app debe funcionar en modo "Full" para desarrollo local.
- **Error Android Build (capacitor.settings.gradle):** Nota: No intentar abrir o sincronizar el proyecto Android en Android Studio (`cap open android` o sincronizar Gradle) sin haber compilado previamente la aplicación web. Hacer esto causa que Capacitor no encuentre la carpeta `out` y falle al generar `capacitor.settings.gradle`, lo que rompe la sincronización de Gradle en Android Studio con el error "Could not read script capacitor.settings.gradle as it does not exist". En su lugar, siempre hacer Z: ejecutar el script de build (ej. `npm run build:registrar` o `npm run build:analitica`) seguido de `npm run app:sync` ANTES de compilar en Android.

## Pasos de Ejecución
1.  **Actualización de `src/app/page.tsx`:** Implementar el renderizado condicional.
2.  **Actualización de `package.json`:** Añadir los nuevos comandos de build.
3.  **Configuración Mobile:** Preparar la exportación estática si es necesario para el APK.
