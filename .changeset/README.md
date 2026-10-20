# Changesets

Esta carpeta guarda los archivos de changeset que consume
[@changesets/cli](https://github.com/changesets/changesets).

## Flujo

1. Tras hacer un cambio en uno o más paquetes, ejecuta:

   ```bash
   pnpm changeset
   ```

2. Selecciona los paquetes afectados y el tipo de bump (major / minor / patch).
3. Haz commit del archivo markdown generado junto con tus cambios.
4. Al publicar, `pnpm version-packages` sube las versiones y genera los
   `CHANGELOG.md`; después `pnpm release` publica en npm.

El action `changesets/action` (`.github/workflows/release.yml`) automatiza el
paso 4 en cada push a `main`: crea un PR de "Version Packages" que acumula
todos los bumps pendientes, y al fusionarlo publica los paquetes en npm.
