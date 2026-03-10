# Directiva SOP: Módulo "Comparativa"

## Objetivo
Establecer el módulo "Comparativa" como el Dashboard principal de la aplicación, permitiendo analizar visualmente el rendimiento de las plazas a través de los años.

## Entradas
- **Locación (Plaza):** Selección de la plaza que se desea analizar.
- **Métrica:** Unificada. La gráfica base utilizará los **Dólares Recaudados**, pero la tarjeta de detalles desplegará un resumen simultáneo de Tickets, Dólares y Bolívares.
- **Años a comparar:** Todos los años que tengan registros de esa locación, o selección explícita.

## Lógica Principal
1. **Recolección de Datos:** 
   - Consultar en Firestore la colección `registros` filtrando por la `locacionId` seleccionada.
2. **Agrupación por Año:** 
   - Iterar los registros para sumarizar el rendimiento (total_dolares, total_tickets, total_bs) agrupado por Año.
   - Construir una estructura de datos donde cada entrada representa un año completo.
3. **Representación Gráfica:**
   - Usar un gráfico de barras (Bar Chart), optimizado para móvil.
   - El desglose de información detallada NO debe presentarse como un Hover Tooltip (se ha deshabilitado el cursor y el contenido del tooltip para evitar ruidos visuales), sino como una **Tarjeta Persistente** debajo del gráfico que se actualiza al tocar la barra deseada.
   - Al tocar una barra, se muestra el detalle del año seleccionado:
     - Totales anuales (USD, Bs, Tickets).
     - Desglose mensual dentro de la tarjeta para referencia secundaria.
   - Eje Y: Métrica principal en Dólares ($).

## Restricciones y Casos Borde
- **Falta de Datos:** Si una locación tiene solo data de un año, mostrar la gráfica igualmente con un aviso indicando que no hay años anteriores para comparar.
- **Gráficos:** Usar una librería estable como `recharts` o `chart.js`. (`recharts` recomendada para React).
- **Consistencia Visual:** Mantener los colores de la aplicación.
- **Firebase Índices:** Nota: No hacer `orderBy` combinado con `where` en campos diferentes en las consultas de Firebase, porque causa el error de *Índice Compuesto requerido* y puede romper la web del cliente. En su lugar, filtrar con `where` en servidor y ordenar los resultados en Javascript temporalmente.

## Pasos de Ejecución
1. [SOP_Install_Chart] Instalar `recharts` usando npm.
2. [SOP_Comparativa_Route] Crear ruta `@/app/comparativa/page.tsx`.
3. [SOP_Comparativa_Fetch] Implementar en `@/services/firestore.ts` una función de obtención de datos históricos de una locación.
4. [SOP_Comparativa_UI] Implementar componente de gráfica que integre en su encabezado el selector de plaza para una UI compacta.
5. [SOP_Nav_Link] Añadir enlace a "Comparativa" en la navegación principal.
