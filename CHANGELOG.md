# Changelog

All notable changes to this project are tracked here. For historical
phase-by-phase implementation notes, migration runbooks, and one-off fix
write-ups, see [docs/archive/](docs/archive/).

The format is loosely based on [Keep a Changelog](https://keepachangelog.com/),
and this project follows semantic versioning when tagging releases.

## [Unreleased]

### Changed
- Repository hygiene: archived 66 historical `*.md` documents from the repo
  root into `docs/archive/`, and moved one-off migration scripts
  (`apply_v1_2_migration.{bat,sh}`, `quick_migrate.bat`) into `scripts/`.
- Removed a stray empty `git` file from the repo root.
- Removed a dead `prisma/migrations/` rule from `.gitignore` (it was
  root-relative and matched nothing — server migrations live at
  `server/prisma/migrations/` and remain tracked).
- `.gitignore` now excludes raw media under `UAT/` (jpeg/png/ogg/mp4/etc).
  Bug reports (`*.md`, `*.pdf`, `*.txt`) under `UAT/` are still tracked.

---

## How to use this file going forward

- Add a new `## [Unreleased]` block on top of this file as you work.
- When you tag a release, rename the block to the version + date.
- Group entries under: `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`,
  `Security`.
- Keep entries short — one line per change. If you need a runbook or a
  detailed write-up, add it under `docs/` and link it from the entry.

Avoid the previous pattern of dropping a new top-level `*.md` in the repo
root for every fix or phase. The archive in `docs/archive/` exists so you
can keep that history without cluttering the project root.
