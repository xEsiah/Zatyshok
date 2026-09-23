# Zatyshok - AI Development Guide & Directives

> **Purpose**
> This document is the absolute source of truth for any AI coding agent working on the Zatyshok codebase.

---

# 1. Strict AI Agent Directives

## Security & Execution

- **Never** execute a `rm -rf` command without explicit user consent.
- **Never** use `sudo` without explicit user consent (password input is required).
- **Do not** look into the `.env` file. Reading `.env.example` is tolerated.

## Version Control (Git)

- When staging files, systematically use `git add .` to avoid missing any modified files.
- **Never** execute `git commit` or `git push` without explicit user consent.

## Code Standards

- **ABSOLUTELY NO COMMENTS IN THE GENERATED SOURCE CODE.** (Unless explicitly requested for documentation purposes).

## Technical Documentation & Representation

- Produce separate technical documentation (`.md` files) for each component or feature.
- Rigorously update this documentation whenever a modification is made to the corresponding component.
- Always ask yourself what is the best way to represent and explain a specific part of the application.
- Use **Mermaid diagrams** inside `.md` files to illustrate architectures, flows, and component interactions.

---

# 2. Project Overview

**Zatyshok** ("Затишок") is a cozy personal desktop application designed to centralize everyday life.

The philosophy of the application is:

- calm, simple, elegant, personal, lightweight, and pleasant to use.

It is **not** intended to become an enterprise application or a productivity monster. Everything should feel soft, minimal, and intuitive.

Current modules include:

- Planner (Goals / Events / Thoughts)
- Mood Tracker
- Budget Manager
- Multimedia Hub (Spotify / Weather)

Future modules may be added while preserving the exact same philosophy.

---

# 3. Tech Stack

- **Frontend:** Electron, React 19, TypeScript, Vite
- **Backend:** Node.js, Express, MariaDB / MySQL
- **UI:** Soft UI (light neumorphism) with dynamic themes using `data-theme=""` (Current themes: him, her, art, artFR, music, musicFR).

---

# 4. General Development Rules

## Step-by-Step Modifications

Every requested feature should be implemented in **small isolated steps**.
For every task:

1. Understand the existing code.
2. Modify only the necessary files.
3. Avoid unrelated refactoring.
4. Keep backward compatibility.
5. Ensure nothing else breaks.

**NEVER rewrite the whole application.** The project is already functional. Do not redesign everything or migrate large parts of the project unless explicitly requested. Large refactors are forbidden.

## Preserve Architecture & Consistency

Before creating new files, search if a similar component/service exists. Reuse existing patterns and stay consistent with the current folder structure, naming conventions, React patterns, hooks, and services. Do not introduce a second way of doing the same thing. Prefer consistency over personal preferences.

---

# 5. Architecture & Framework Rules

## Design & UI

- **Never hardcode colors.** Always use CSS variables defined inside `main.css` (e.g., `color: var(--text-color);`).
- Reuse components and avoid duplicate UI.
- The application supports three responsive layouts: **Full, 80%, and Split**. Every UI modification must work correctly in all three.

## API Rules

- All API calls must go through the `services/` folder, especially `apiClient.ts`.
- Never bypass it. Headers (Version, Token, Auth) are centralized there.

## Contexts

- **UserContext:** Contains translations, session, and user data.
- **ModalContext:** Responsible for global overlays, dialogs, and modal management.
- Reuse existing contexts whenever possible.

## Security Rules

- **SQL:** Always verify `user_id` inside queries to prevent IDOR vulnerabilities.
- **Authentication:** The app currently uses database tokens but is migrating toward JWT. New auth features must be JWT-compatible.

## Electron Rules

- Anything interacting with the OS must go through `preload/index.ts`.
- **Never** access Node APIs directly from the renderer. Always use IPC.

## Internationalization (i18n)

- Whenever you add text, buttons, labels, notifications, or modals, you **must** update every translation file inside `src/renderer/src/locales/`.
- Never leave untranslated strings.

---

# 6. Expected Workflow

For each task:

1. Analyze the existing implementation.
2. Identify the minimum number of files to modify.
3. Explain what will be changed.
4. Implement the change.
5. Verify that existing functionality still works.
6. Do not modify unrelated code.

---

# 7. Roadmap & Future Changes

**All future changes, feature requests, planned modules, and the long-term roadmap are exclusively located in the `ToDo.md` file.**

Do not assume or invent long-term goals in this document. Always refer to `ToDo.md` for upcoming tasks (such as Mood Tracker history loading, Budget charts fixes, macOS builds, Audio notes, Recurring events, and new lexical themes).
