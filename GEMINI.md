# Zatyshok - AI Development Guide

> **Purpose**
>
> This document is intended for AI coding agents that will work on the Zatyshok codebase.
>
> You will also receive the project tree and some base files to understand the architecture before making any modifications.

---

# Project Overview

**Zatyshok** ("Затишок") is a cozy personal desktop application designed to centralize everyday life.

The philosophy of the application is:

- calm
- simple
- elegant
- personal
- lightweight
- pleasant to use

It is **not** intended to become an enterprise application or a productivity monster.

Everything should feel soft, minimal and intuitive.

Current modules include:

- Planner (Goals / Events / Thoughts)
- Mood Tracker
- Budget Manager
- Multimedia Hub (Spotify / Weather)

Future modules may be added while preserving the same philosophy.

---

# Tech Stack

## Frontend

- Electron
- React 19
- TypeScript
- Vite

## Backend

- Node.js
- Express
- MariaDB / MySQL

## UI

Soft UI (light neumorphism)

Dynamic themes using

```html
data-theme=""
```

Current themes:

- him
- her
- art
- artFR

---

# General Rules

## 1. NEVER rewrite the whole application

The project is already functional.

Do **not** redesign everything.

Do **not** migrate large parts of the project unless explicitly requested.

Always work incrementally.

---

## 2. Step-by-step modifications

This is extremely important.

Every requested feature should be implemented in **small isolated steps**.

For every task:

1. understand the existing code
2. modify only the necessary files
3. avoid unrelated refactoring
4. keep backward compatibility
5. ensure nothing else breaks

Large refactors are forbidden unless explicitly requested.

---

## 3. Preserve the existing architecture

Before creating new files:

- search whether a similar component/service already exists
- reuse existing patterns
- stay consistent with the current architecture

Do not introduce a second way of doing the same thing.

---

## 4. Keep the code style consistent

Respect:

- existing naming
- existing folder structure
- existing React patterns
- existing hooks
- existing services

Prefer consistency over personal preferences.

---

# Design Rules

## Theme

Never hardcode colors.

Always use CSS variables defined inside:

```
main.css
```

Example:

Good

```css
color: var(--text-color);
```

Bad

```css
color: #ffffff;
```

---

## Components

When possible:

- reuse components
- avoid duplicate UI
- create reusable components only if they will actually be reused

---

## Responsive

The application supports three layouts:

- Full
- 80%
- Split

Every UI modification should work correctly in all three layouts.

---

# API Rules

All API calls must go through

```
services/
```

and especially

```
apiClient.ts
```

Never bypass it.

Headers (Version, Token, Auth...) are centralized there.

---

# Contexts

## UserContext

Contains:

- translations
- session
- user data

## ModalContext

Responsible for:

- global overlays
- dialogs
- modal management

Reuse existing contexts whenever possible.

---

# Security Rules

Always keep security in mind.

## SQL

Always verify

```
user_id
```

inside queries.

Prevent IDOR vulnerabilities.

---

## Authentication

Current authentication still uses a database token.

The application is progressively migrating toward JWT.

Any new authentication-related feature should be compatible with JWT.

---

# Electron Rules

Anything interacting with the operating system must go through

```
preload/index.ts
```

Never access Node APIs directly from the renderer.

Always use IPC.

---

# Internationalization

Whenever you add:

- text
- button
- label
- notification
- modal

You **must** update every translation file inside

```
src/renderer/src/locales/
```

Never leave untranslated strings.

---

# Development Philosophy

When implementing a feature:

- keep it simple
- keep it clean
- avoid unnecessary dependencies
- preserve performance
- preserve readability

If two implementations exist, prefer the simplest one.

---

# Expected Workflow

For each task:

1. Analyse the existing implementation.
2. Identify the minimum number of files to modify.
3. Explain what will be changed.
4. Implement the change.
5. Verify that existing functionality still works.
6. Do not modify unrelated code.

---

# Long-Term TODO / Roadmap

The following features are planned.

These should **NOT** all be implemented at once.

Each one should become its own isolated task.

---

## Mood Tracker

### Mood History

Current mood history has a fixed limit.

Improve it by:

- keeping the initial limit
- adding a **"See more"** button
- progressively loading older entries

Avoid loading the entire history immediately.

---

## Budget

### Budget Distribution Chart

Improve the Budget Distribution pie chart.

Current issue:

- chart isn't perfectly centered

Expected:

- perfectly centered horizontally
- perfectly centered vertically

---

## macOS Build

Add support for macOS builds.

The Electron build pipeline should support:

- Windows
- Linux
- macOS

without breaking existing configurations.

---

## New theme

Add theme music in french & english

New file in locales beside

- him
- her
- art
- artFR
- music
- musicFR

## Get inspired by art & artFR to replace the texte in a lexical that matches musician aesthetic

## Audio Notes

Planner entries should optionally support audio.

Possible behavior:

- user records or imports audio
- title remains the normal text field
- note displays:
  - title
  - embedded audio player

The player should include:

- Play / Pause
- Progress bar
- Playback speed

Supported speeds:

- x1
- x1.5
- x2

This feature should integrate naturally with existing notes without duplicating the entire planner system.

---

## Recurring Events

Planner events should optionally become recurring.

Example recurrence rules:

- every Monday
- every Tuesday
- every Saturday
- every day
- every week
- every month

A checkbox should enable recurrence.

The recurrence should be based on the creation or edited date when appropriate.

The implementation should remain flexible enough for future expansion.

---

# Final Reminder

When working on this project:

- never rush large changes
- avoid unnecessary rewrites
- preserve the existing architecture
- implement features progressively
- prioritize stability over cleverness
- always think about maintainability
- keep the application cozy, lightweight and pleasant to use

Incremental improvements are always preferred over massive refactoring.
