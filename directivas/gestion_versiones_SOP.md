# Directiva SOP: Gestión de Versiones (Git/GitHub)

## Objetivo
Mantener el repositorio de GitHub actualizado con los últimos cambios de código y documentación (directivas), asegurando que la "memoria" del proyecto esté sincronizada.

## Entradas
- Cambios realizados en el código dentro de `resumen-taquilla/`.
- Actualizaciones en los archivos de `directivas/`.

## Lógica Principal
1. **Sincronización de Memoria:** Antes de cada commit, verificar si las directivas en `directivas/` reflejan los últimos cambios técnicos o restricciones aprendidas.
2. **Inclusión de Documentación:** Asegurar que la carpeta `directivas/` esté incluida en el repositorio (moverla dentro de `resumen-taquilla/` si es necesario para el seguimiento conjunto).
3. **Commit Descriptivo:** Usar mensajes de commit que sigan la convención: `{Tipo}: {Descripción breve del cambio}`.
   - Tipos: `Feat`, `Fix`, `Docs`, `Refactor`, `Style`, `Chore`.
4. **Push:** Enviar los cambios a la rama `main` en `origin`.

## Restricciones y Casos Borde
- **Archivos Sensibles:** Nunca añadir archivos `.env` o credenciales. Verificar `.gitignore`.
- **Error "10K Changes" en VS Code:** Si Git detecta miles de archivos (especialmente en Windows), se debe a que `node_modules` o carpetas de `build` no están siendo ignoradas correctamente. 
  - *Solución:* Usar en `.gitignore` nombres de carpeta directos (ej: `node_modules/`) sin el slash inicial `/` para asegurar compatibilidad en Windows.
- **Conflictos:** Si hay cambios en el remoto, hacer `git pull --rebase` antes de empujar.
- **Directivas Externas:** Si las directivas están fuera del repo, el commit solo del código dejaría la "memoria" obsoleta en GitHub. Recomendación: Mantener `directivas/` dentro del repo.

## Pasos de Ejecución
1. [SOP_Sync_Docs] Actualizar archivos en `directivas/` con los aprendizajes de la sesión.
2. [SOP_Stage_All] Ejecutar `git add .` en la raíz del repositorio.
3. [SOP_Commit] Ejecutar `git commit -m "{mensaje}"`.
4. [SOP_Push] Ejecutar `git push origin main`.
