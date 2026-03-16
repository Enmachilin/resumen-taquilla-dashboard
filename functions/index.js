const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { setGlobalOptions } = require('firebase-functions/v2');
const admin = require('firebase-admin');

// Inicializar la aplicación de Firebase Admin
admin.initializeApp();

// Configurar opciones globales para Gen 2 (región us-central1 por defecto)
setGlobalOptions({ region: 'us-central1' });

/** 
 * Trigger Gen 2 que se activa cuando se crea un nuevo documento en la colección 'registros_diarios'.
 * Envía notificaciones push a todos los administradores registrados.
 */
exports.notificarNuevoRegistro = onDocumentCreated('registros_diarios/{registroId}', async (event) => {
    const registro = event.data.data();
    const registroId = event.params.registroId;

    if (!registro) {
        console.log("No hay datos en el documento creado.");
        return null;
    }

    console.log(`Procesando registro Gen 2: ${registroId} de la locacion: ${registro.locacionId}`);

    try {
        // 1. Obtener el nombre real de la plaza
        let nombrePlaza = registro.locacionId;
        const plazaSnapshot = await admin.firestore()
            .collection('puntos_venta')
            .doc(registro.locacionId)
            .get();
            
        if (plazaSnapshot.exists) {
            nombrePlaza = plazaSnapshot.data().nombre || nombrePlaza;
        }

        // 2. Obtener todos los tokens almacenados en 'dispositivos_admin'
        const adminTokensSnapshot = await admin.firestore()
            .collection('dispositivos_admin')
            .get();

        if (adminTokensSnapshot.empty) {
            console.log("No hay dispositivos admin registrados con tokens FCM.");
            return null;
        }

        const tokens = adminTokensSnapshot.docs.map(doc => doc.id);
        console.log(`Enviando notificación Gen 2 a ${tokens.length} dispositivos.`);

        // 3. Preparar el mensaje Multicast para FCM
        const message = {
            notification: {
                title: '📊 Nuevo Registro Detectado',
                body: `📍 ${nombrePlaza}\n🎫 Tickets: ${registro.tickets}\n💵 Monto: $${registro.monto}`,
            },
            data: {
                registroId: registroId,
                locacionId: registro.locacionId,
            },
            android: {
                notification: {
                    sound: 'default',
                    clickAction: 'FCM_PLUGIN_ACTIVITY',
                },
            },
            tokens: tokens,
        };

        // 4. Enviar mediante FCM
        const response = await admin.messaging().sendEachForMulticast(message);
        console.log(`Resultado del envío: ${response.successCount} exitosos, ${response.failureCount} fallidos.`);

        // 5. Limpieza automática de tokens inválidos
        if (response.failureCount > 0) {
            const failedTokens = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    const errorCode = resp.error?.code;
                    if (errorCode === 'messaging/invalid-registration-token' ||
                        errorCode === 'messaging/registration-token-not-registered') {
                        failedTokens.push(tokens[idx]);
                    }
                }
            });
            
            if (failedTokens.length > 0) {
                console.log(`Limpiando ${failedTokens.length} tokens inválidos de Firestore.`);
                const batch = admin.firestore().batch();
                failedTokens.forEach(t => 
                    batch.delete(admin.firestore().collection('dispositivos_admin').doc(t))
                );
                await batch.commit();
            }
        }

    } catch (error) {
        console.error('Error crítico en notificarNuevoRegistro:', error);
    }

    return null;
});
