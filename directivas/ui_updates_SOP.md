## Estado: Completado ✅
Se ha implementado un control tipo "Segmented Control" (Toggle) en la esquina superior derecha del header en `src/app/page.tsx`, y se ha profesionalizado toda la iconografía del sistema.

## Detalles de Implementación Iconografía (SVG)
- **Eliminación de Emojis**: Se han removido todos los iconos tipo emoji (📈, ✍️, ❌, 📊, 📂, ✅, 🌧️, ⚠️, 🎫, ℹ️) de toda la aplicación.
- **Iconos Profesionales**: Se han integrado iconos SVG (Lucide/Heroicons style) consistentes y minimalistas.
- **Notificaciones**: El icono de notificación en el header ahora es un botón sutil con una campana rellena y un indicador de punto con animación "pulse" (en lugar de "bounce"), evitando estéticas de juego.
- **Sincronización**: El botón de "Sync" de la Tasa BCV ahora es un botón de acción integrado con el sistema, con feedback visual (spinner) durante la carga.

## Detalles de Navegación y Layout
- **Toggle Header**: El toggle es visible en todas las pantallas. Utiliza un fondo gris suave (`bg-gray-100`) con un indicador blanco animado.
- **Remoción de Navegación Móvil Inferior**: Se eliminó el componente `<nav>` inferior para unificar la experiencia de usuario.
- **Botones Sticky**: Los botones "Continuar" y "Atrás" en `RegistroForm` son fijos (`fixed`) a 10px del borde inferior, con un gradiente para legibilidad.

## Notas Técnicas
- **Message State**: En `RegistroForm`, el estado `message` ahora acepta `ReactNode` para permitir iconos en los mensajes de feedback.
- **Z-Index**: Los componentes críticos (Header, Botones Sticky, Modales) tienen jerarquías de z-index definidas para evitar solapamientos.
- **Animaciones**: Se priorizan transiciones de opacidad y escala sutiles sobre rebotes o desplazamientos bruscos.
