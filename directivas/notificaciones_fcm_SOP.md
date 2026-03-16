# SOP: Implementación de Notificaciones Push con Cloud Functions

Esta directiva define el procedimiento para habilitar y mantener el sistema de alertas móviles para administradores de la aplicación DataPark.

## 🎯 Objetivo
Que el administrador reciba una notificación automática en su celular Android inmediatamente después de que se registre un nuevo dato de taquilla, funcionando incluso con la app cerrada.

## 🏗️ Arquitectura del Sistema
1.  **Frontend (App Admin):** Solicita permisos al inicio, se registra en FCM (Firebase Cloud Messaging) y guarda el token del dispositivo en la colección de Firestore `dispositivos_admin`.
2.  **Base de Datos (Firestore):** Actúa como disparador (Trigger) cuando se crea un nuevo documento en `registros_diarios`.
3.  **Backend (Cloud Functions):** Código servidor que escucha el cambio en Firestore, recupera los tokens de administrador y utiliza la API de Admin Messaging para enviar el mensaje push.

## 🛡️ Pasos de Implementación
1.  **Configuración Nativa:** El archivo `google-services.json` debe estar en `android/app/`.
2.  **Dependencias:** Capacitor `@capacitor/push-notifications` para el APK y `firebase-admin`/`firebase-functions` para el servidor.
3.  **Lógica del Servidor:** La función `notificarNuevoRegistro` debe:
    *   Extraer los datos del nuevo registro.
    *   Buscar tokens de dispositivos válidos.
    *   Limpiar tokens obsoletos (inválidos) tras cada envío fallido.

## 🛑 Restricciones y Advertencias (Memoria Viva)
-   **Plan Blaze Requerido:** Las Cloud Functions NO funcionan en el plan Spark (gratuito) de Firebase. Intentar desplegarlas (`firebase deploy`) en un plan gratuito dará error de "artifactregistry missing permission" o "billing not enabled".
-   **Permisos en Android:** La aplicación debe solicitar explícitamente el permiso de notificaciones; de lo contrario, Android bloqueará la recepción del token.
-   **Foreground vs Background:** Si la app está abierta, se debe manejar el evento `pushNotificationReceived`. Si está cerrada, el mensaje debe incluir los campos `notification` (title, body) para que el sistema Android lo muestre automáticamente.
-   **Firebase Use:** Antes de desplegar, siempre usar `firebase use [projectId]` para evitar desplegar en el proyecto equivocado si se manejan varios.

---
*Ultima actualización: 2024-03-16*
