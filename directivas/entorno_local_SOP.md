# Directiva SOP: Configuración y Ejecución del Entorno Local

## Objetivo
Establecer y ejecutar el entorno de desarrollo local para el proyecto Next.js "Resumen de Taquilla".

## Requisitos Previos
- Node.js instalado.
- Dependencias de `npm` instaladas.
- Archivo `.env.local` configurado con las credenciales de Firebase.

## Lógica Principal
1. **Verificación de Dependencias:** Asegurar que `node_modules` existe. Si no, ejecutar `npm install`.
2. **Ejecución del Servidor de Desarrollo:** Iniciar el comando `npm run dev`.
3. **Acceso:** Abrir el navegador en `http://localhost:3000`.

## Restricciones y Casos Borde
- **Puerto Ocupado:** Si el puerto 3000 está ocupado, Next.js intentará usar el 3001. Verificar la consola para la URL exacta.
- **Variables de Entorno:** Si ocurren errores de Firebase, verificar que `.env.local` contenga todas las claves necesarias.
- **Cache de Next.js:** Si hay comportamientos extraños, borrar la carpeta `.next` y reiniciar.
- **Fallo de Pyre2 (Pyrefly):** Si VS Code muestra errores de "Pyre2 language server crashed", se debe a un bug interno de la extensión Pyrefly al procesar archivos de Python en Windows. Solución: Desactivar la extensión "Pyrefly" y usar la oficial de "Python (Microsoft)".

## Pasos de Ejecución
1. [Ejecución] - Correr `npm run dev`.
2. [Verificación] - Confirmar que el servidor está escuchando en el puerto indicado.
