# Base Starter - Angular + PrimeNG

This folder (`ux_starts/angular_primeng`) is now a **stripped-down starter** that keeps the reusable base components, but removes the previous app-specific pages/services/tests.

## What’s included

- **Base components**: everything under `src/app/components/` (notably `pb-item-list`, `pb-item-detail`, and `pb-dashboard`)
- **Auth**:
  - `src/app/services/auth.service.ts`
  - `src/app/services-mock/mock-auth.service.ts`
- **Todo**:
  - `src/app/services/todo.service.ts` (localStorage-backed)
  - `src/app/pages/todo/todo-list.component.ts` (uses `pb-item-list`)
- **Navigation**: a single sidebar item for **Todo List**
- **Tests**: removed (all `*.spec.ts`, Jest config, and test scripts)

## Routes

- **`/auth`**: sign-in page
- **`/todo`**: todo list (requires auth via `authGuard`)
- **`/`**: redirects to `/todo`

Routes are defined in `src/app/app.routes.ts`.

## Theming / styling (easy to swap)

There are two style “layers”:

- **App CSS variables** (recommended for quick restyling)
  - Themes live in `src/styles.css` under `html[data-theme='...']`
  - Switch theme by changing `data-theme` in `src/index.html` (e.g. `base` → `midnight`)
- **PrimeNG theme preset**
  - Set in `src/app/app.config.ts` via `providePrimeNG({ theme: { preset: ... } })`

## Development

### Prereqs

- Node.js 18+

### Install & run

```bash
npm install
npm start
```

### Run with mock auth

```bash
npm run start:mock
```

## Notes

- Todos are stored in the browser’s **localStorage** under the key `todos`.
- The Todo page supports:
  - Add (toolbar “+” or Add button)
  - Toggle complete (click row)
  - Delete
  - Clear completed
  - Seed sample data
