---
name: "GitFlow Manager"
description: "Habilidad para gestionar ramas y lanzamientos usando la metodología Git Flow y respetando reglas de GitHub."
---

---
name: gitflow-manager
description: >
  Gestión completa del flujo de trabajo Git siguiendo Gitflow clásico para proyectos en GitHub.
  Usa esta skill siempre que el usuario mencione ramas, branches, features, releases, hotfixes,
  merges, pull requests, versionado, tags, changelog, commits, o cualquier operación relacionada
  con el flujo de Git. También actívala cuando el usuario diga cosas como "quiero empezar una
  feature", "hay un bug en producción", "vamos a hacer release", "crea una rama", "sube los
  cambios", "abre un PR", o pida ayuda para organizar su trabajo en Git.
---

# Gitflow Manager

Skill para gestionar el ciclo de vida completo de desarrollo usando **Gitflow clásico** sobre **GitHub**.

---

## Estructura de ramas

```
main          → Producción. Solo recibe merges de release/* y hotfix/*
develop       → Integración. Base de todas las features
feature/*     → Nuevas funcionalidades (salen de develop, vuelven a develop)
release/*     → Preparación de versión (salen de develop, van a main + develop)
hotfix/*      → Parches urgentes en producción (salen de main, van a main + develop)
```

---

## Convención de nombres

| Tipo       | Formato                          | Ejemplo                        |
|------------|----------------------------------|--------------------------------|
| Feature    | `feature/<ticket-o-descripcion>` | `feature/user-authentication`  |
| Release    | `release/<version>`              | `release/1.3.0`                |
| Hotfix     | `hotfix/<descripcion-corta>`     | `hotfix/fix-login-crash`       |
| Tag        | `v<semver>`                      | `v1.3.0`                       |

---

## Conventional Commits

Todo commit debe seguir este formato:

```
<tipo>(<scope>): <descripción corta en imperativo>

[cuerpo opcional]

[footer opcional: BREAKING CHANGE, closes #issue]
```

### Tipos permitidos

| Tipo       | Cuándo usarlo                                      |
|------------|----------------------------------------------------|
| `feat`     | Nueva funcionalidad                                |
| `fix`      | Corrección de bug                                  |
| `docs`     | Solo cambios en documentación                      |
| `style`    | Formato, espacios, comas (sin cambio de lógica)    |
| `refactor` | Refactorización sin nueva feature ni fix           |
| `test`     | Añadir o corregir tests                            |
| `chore`    | Tareas de build, CI, dependencias                  |
| `perf`     | Mejora de rendimiento                              |
| `ci`       | Cambios en configuración CI/CD                     |
| `revert`   | Revertir un commit anterior                        |

**Ejemplos:**
```bash
feat(auth): add JWT refresh token support
fix(api): handle null response from payment gateway
chore(deps): update axios to 1.7.0
docs(readme): add setup instructions for M1 macs
```

---

## Flujos de trabajo

### 1. Iniciar una Feature

```bash
git checkout develop
git pull origin develop
git checkout -b feature/<nombre>
```

> Trabaja en la rama. Haz commits con Conventional Commits.

```bash
# Al terminar — abrir Pull Request en GitHub
# Base: develop | Compare: feature/<nombre>
# Título del PR: feat(<scope>): <descripción>
# Asignar reviewers antes de mergear
```

**Merge:** Usar **Squash and Merge** en GitHub para mantener historial limpio en develop.

```bash
# Después del merge, limpiar rama local
git checkout develop
git pull origin develop
git branch -d feature/<nombre>
```

---

### 2. Crear un Release

Se usa cuando `develop` está listo para pasar a producción.

```bash
git checkout develop
git pull origin develop
git checkout -b release/<version>  # ej: release/1.3.0
```

En esta rama solo se permiten:
- Bump de versión en archivos (`package.json`, `pyproject.toml`, etc.)
- Actualización del CHANGELOG
- Corrección de bugs menores de último momento

```bash
# Actualizar versión y CHANGELOG, luego commit:
git commit -m "chore(release): bump version to <version>"

# Abrir dos PRs en GitHub:
# PR 1 → base: main     | compare: release/<version>
# PR 2 → base: develop  | compare: release/<version>
```

**Merge en main:** Usar **Merge Commit** (no squash) para preservar historial.

```bash
# Después del merge a main, crear tag:
git checkout main
git pull origin main
git tag -a v<version> -m "Release v<version>"
git push origin v<version>
```

**Merge en develop:** También con Merge Commit.

```bash
git branch -d release/<version>
```

---

### 3. Hotfix — Bug urgente en producción

```bash
git checkout main
git pull origin main
git checkout -b hotfix/<descripcion>
```

> Corrige el bug. Commit con `fix(<scope>): <descripción>`.

```bash
# Bump de patch version y actualizar CHANGELOG
git commit -m "chore(release): bump version to <version-patch>"

# Abrir dos PRs en GitHub:
# PR 1 → base: main     | compare: hotfix/<descripcion>
# PR 2 → base: develop  | compare: hotfix/<descripcion>
```

**Merge en main** con Merge Commit → **Crear tag** igual que en release.

**Merge en develop** con Merge Commit.

```bash
git branch -d hotfix/<descripcion>
```

---

## CHANGELOG

Mantener un archivo `CHANGELOG.md` en la raíz del proyecto con este formato:

```markdown
# Changelog

## [Unreleased]

## [1.3.0] - 2024-01-15
### Added
- feat(auth): add JWT refresh token support

### Fixed
- fix(api): handle null response from payment gateway

### Changed
- refactor(db): simplify connection pooling logic
```

- **Unreleased** acumula cambios durante el desarrollo en `develop`
- Al crear el release, renombrar `[Unreleased]` con la versión y fecha

---

## Versionado Semántico (SemVer)

```
MAJOR.MINOR.PATCH
```

| Cambio                        | Qué incrementar |
|-------------------------------|-----------------|
| Breaking change (`BREAKING`)  | MAJOR           |
| Nueva funcionalidad            | MINOR           |
| Bug fix o parche               | PATCH           |

---

## Pull Requests — Estándares

### Título
Seguir Conventional Commits: `feat(scope): descripción`

### Body (template recomendado)
```markdown
## ¿Qué hace este PR?
Descripción breve del cambio.

## ¿Por qué?
Contexto o ticket relacionado. Closes #<issue>

## Checklist
- [ ] Tests añadidos / actualizados
- [ ] CHANGELOG actualizado (solo en release/hotfix)
- [ ] No hay console.logs ni código de debug
```

### Reglas
- Mínimo **1 aprobación** antes de mergear
- El autor **no se auto-aprueba**
- CI debe pasar antes del merge
- Rama debe estar **actualizada con base** antes del merge

---

## Protección de ramas recomendada en GitHub

| Rama      | Reglas sugeridas                                              |
|-----------|---------------------------------------------------------------|
| `main`    | Require PR + 1 approval + CI passing. No force push.         |
| `develop` | Require PR + 1 approval + CI passing. No force push.         |

---

## Comandos de referencia rápida

```bash
# Ver estado del repo
git status
git log --oneline --graph --all

# Sincronizar con remoto
git fetch --all --prune
git pull origin <rama>

# Eliminar ramas remotas ya mergeadas
git fetch --prune

# Ver tags
git tag -l --sort=-v:refname

# Comparar ramas
git diff develop..feature/<nombre>
```

---

## Errores comunes y cómo evitarlos

| Error                                  | Solución                                              |
|----------------------------------------|-------------------------------------------------------|
| Hacer push directo a `main` o `develop`| Siempre usar PR                                       |
| Feature contra `main`                  | La base siempre es `develop`                          |
| Olvidar actualizar `develop` tras hotfix | Siempre abrir PR a `develop` también                |
| Merge sin tag en release               | Tagear `main` inmediatamente después del merge        |
| Commits sin convención                 | Revisar tipo+scope antes de cada `git commit`         |