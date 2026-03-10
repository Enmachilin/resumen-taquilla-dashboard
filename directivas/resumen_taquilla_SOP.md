# Directiva SOP: Dashboard "Resumen de Taquilla"

## Objetivo
Construir una aplicación para la gestión y comparación interanual de ingresos en parques de atracciones, centrada en una visualización gráfica de alto impacto.

## Entradas
- **Tickets:** Número de entradas vendidas.
- **Tasa Dólar:** Precio del dólar del día (BCV).
- **Locación:** Punto de venta activo.
- **Status:** Operativo, Lluvia, Mudanza, Libre.

## Lógica Principal
1. **Identificación de Documento:** ID único `YYYY-MM-DD_{locacion-id}`.
2. **Cálculo de Rendimiento:** `TotalCalculado = Tickets * TasaDolar`.
3. **Comparativa Interanual:** 
   - Buscar registro con misma `locacionId` y fecha (mismo día/mes) del año `-1`.
   - Calcular: `((TotalActual / TotalAnterior) - 1) * 100`.
4. **Visualización:**
   - Verde: % > 0.
   - Amarillo: % == 0 (o margen mínimo).
   - Rojo: % < 0.
5. **Gráficos y UX:**
    - Reset de Focus: Deshabilitar el contorno azul predeterminado en elementos de gráficas (SVG, barras, sectores) para evitar ruido visual, manteniendo `focus-visible` para accesibilidad.
6. **Gestión de Registros:**
    - Los registros en la vista principal deben aparecer agrupados por Mes dentro del año seleccionado para facilitar la navegación cronológica.

## Restricciones y Casos Borde
- **Día No Laborado:** Si el status no es "operativo", omitir campo de tickets pero obligar a llenar "motivoInactividad".
- **Sin Datos Previos:** Si no existe registro del año anterior, mostrar "Sin comparativa" o 0%.
- **Sincronización:** Habilitar persistencia offline de Firestore para entornos con mala señal.

## Pasos de Ejecución (scripts/)
1. [SOP_Load_Base] - Creación de la estructura base en Next.js.
2. [SOP_Firebase_Init] - Configuración de Firestore.
3. [SOP_UI_Forms] - Construcción de formularios.
4. [SOP_Logic_Dash] - Implementación de filtros y comparativa.
5. [SOP_UI_Grouping] - Implementación de agrupamiento por meses en RegistrosView.
