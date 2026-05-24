---
name: bem-css
description: Use when creating, editing, or reviewing CSS/SCSS/CSS Modules class names in this repository. Enforce BEM naming and TS/TSX class access conventions.
---

# BEM CSS Convention

Apply this for all project-owned styles.

## Required Naming

- Do not use camelCase class names.
- Use kebab-case for blocks.
- Use `__` for elements.
- Use `--` for modifiers.

Examples:

- `.pageScaleWrap` -> `.page-scale-wrap`
- `.headerLeft` -> `.header__left`
- `.cellRight` -> `.cell--right`
- `.summaryRow` -> `.summary__row`

## CSS Modules in TS/TSX

- Use dot notation only for identifier-safe names.
- Use bracket notation for hyphenated/modifier names.

Examples:

- `styles.wrapper`
- `styles['page-scale-wrap']`
- `styles['cell--right']`

## Scope and Exceptions

- Apply to app-owned styles in `src/**`.
- Preserve third-party/admin integration selectors when renaming would break upstream hooks.
- For payload admin hooks, keep known upstream selectors unless there is an explicit migration plan.

## Refactor Checklist

1. Rename selectors in `.scss`/`.css` files.
2. Update all `styles.*` references in TS/TSX.
3. Use bracket access for hyphenated names.
4. Re-run diagnostics and fix type errors from invalid dot notation.
5. Verify no remaining camelCase selectors in touched scope.
