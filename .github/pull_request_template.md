## Resumen

<!-- ¿Qué cambia este PR y por qué? Enlazá los issues con `Fixes #NNN`. -->

## Tipo

<!-- Marcá el tipo de Conventional Commits que corresponde a tus commits. -->

- [ ] `feat` — feature nueva o API pública
- [ ] `fix` — corrección de bug
- [ ] `docs` — solo documentación
- [ ] `refactor` — cambio de código sin cambio de comportamiento
- [ ] `perf` — mejora de performance
- [ ] `test` — solo tests
- [ ] `chore` — tooling, config, dependencias

## Checklist

- [ ] El título sigue [Conventional Commits](https://www.conventionalcommits.org/) (`commitlint` lo valida).
- [ ] Changeset agregado con `pnpm changeset` (omitir solo en cambios de docs/tooling sin efecto publicado).
- [ ] Tests agregados o actualizados (`pnpm --filter @qr-render/<paquete> run test`).
- [ ] Verificación en verde: `pnpm fmt:check && pnpm lint && pnpm build && pnpm test:run`.

## Verificación

<!-- Pegá la salida relevante, p. ej. conteo de tests, status del build. -->
