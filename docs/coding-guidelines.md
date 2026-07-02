# 🛠️ Coding Guidelines

This document outlines the standard coding practices and conventions for the GreenCoin codebase. All contributors must follow these rules to maintain consistency, readability, and high code quality.

---

##  Naming Conventions

Consistency in naming reduces cognitive load. We use specific cases depending on the architectural element.

### `PascalCase`
*   **Frontend Component Files:** All UI component files and declarations (e.g., `WalletCard.tsx`, `Navbar.vue`).
*   **Classes and Types:** All class names, interfaces, type aliases, and enums (e.g., `class UserService`, `type TransactionStatus`).

### `camelCase`
*   **Variables & Constants:** All local variables, objects, and configurations (e.g., `const userBalance = 0`).
*   **Functions & Methods:** All helper functions and class methods (e.g., `function calculateRewards()`).

### `kebab-case`
*   **URL Slugs & Routing:** All public web routes and API endpoints (e.g., `/api/v1/user-profile`).
*   **File Names (Non-Components):** Config files, assets, and standard utility files (e.g., `auth-helper.ts`, `tailwind.config.js`).

---

##  Folder Rules

*   **Flat & Modulized:** Group files by feature/module rather than technical role where possible (e.g., keep `wallet.controller.ts`, `wallet.service.ts`, and `wallet.test.ts` in the same feature folder).
*   **Lower-case Names:** All folder names must be strictly `kebab-case` or lowercase (e.g., `src/components/common/`, `src/features/auth/`).
*   **Index Exports:** Use `index.ts` files sparingly only to expose public interfaces for a directory module. Clean up raw deep nesting imports.

---

##  API Rules

*   **RESTful Design:** Use nouns for endpoints, not verbs (e.g., `GET /transactions` instead of `GET /getTransactions`).
*   **Payload Versioning:** Always prefix API paths with a version identifier (e.g., `/api/v1/...`).
*   **Stateless Requests:** Pass credentials using authorization headers (`Bearer <token>`). Do not store session state on the server.
*   **Data Validation:** Validate all incoming requests at the API boundary before passing them to internal services.

---

##  Error Handling

*   **Never Swallow Errors:** Avoid empty `catch` blocks. If an error is caught, it must be either handled, logged, or rethrown safely.
*   **Standardized Responses:** API errors must return a consistent payload:
    ```json
    {
      "success": false,
      "error": "INVALID_BALANCE",
      "message": "The wallet has insufficient funds for this action."
    }
    ```
*   **Graceful Degration:** Frontend UI components must use local error boundaries or safe error fallback states to prevent application crashes.

---

##  Logging

*   **No Raw Console Logs:** Production code must strictly never use generic `console.log()` statements.
*   **Structured Logs:** Use the native system logging utility or logger module. Include dynamic context safely (timestamp, module, severity).
*   **Log Levels:** Use levels appropriately:
    *   `debug`: High-volume information helpful during development.
    *   `info`: Significant, routine system milestones (e.g., "Database connected").
    *   `warn`: Non-breaking operational anomalies (e.g., "API fallback triggered").
    *   `error`: Full operational failures requiring attention.
*   **No PII:** Never print Personally Identifiable Information (passwords, private keys, emails) to logs.

---

##  Reusable Components

*   **Single Responsibility:** A component should do exactly one thing well. Break complex layouts into minor presentation components.
*   **Props Over Config:** Control UI behavior through predictable, explicitly-typed props/inputs instead of global state context.
*   **Atomic Design:** Keep styling scoped. Put foundational primitives (buttons, inputs) in a shared common folder to promote global accessibility.

---

##  No Duplicate Code (DRY)

*   **Don't Repeat Yourself:** Abstract duplicate blocks of calculation, business logic, or interface structures into shared utilities or hooks.
*   **Rule of Three:** If you write the exact same logic twice, keep it. If you write it a third time, extract it into a central, reusable utility function immediately.
*   **Shared Types:** Do not redefine API models separately on client and server files. Map models cleanly across namespaces.
