# Zatyshok

> A cozy, minimalist moodboard and productivity suite built with Electron, React, and TypeScript.

[![Framework](https://img.shields.io/badge/Framework-Electron-blue)](https://www.electronjs.org/)
[![Library](https://img.shields.io/badge/Library-React-61dafb)](https://reactjs.org/)
[![Language](https://img.shields.io/badge/Language-TypeScript-blue)](https://www.typescriptlang.org/)

**Zatyshok** (Ukrainian for _Cozy/Comfort_) is a personal desktop application designed to create a warm, organized digital space. It combines emotional tracking (moodboard) with functional productivity tools.

---

## ✨ Features

- 🎭 **Dynamic User Profiles**: Manage your identity with a dedicated profile view.
- 📊 **Real-time Statistics**: Visualize your productivity at a glance (Moods, Goals, Events, and Notes counts).
- 🖼️ **Avatar Management**: Custom profile picture upload with automatic server-side cleanup of legacy files.
- 🛠 **Productivity Hub**: Manage your daily tasks, schedule, and events in a unified "Soft-UI" interface.
- 🎭 **Mood Tracking**: Log and visualize your emotional journey with a browsable history.
- 🎵 **Spotify Integration**: Control your music and see what's currently playing directly in the app.
- 💰 **Budget Management**: Track income and expenses with category-based pie charts and time filters.
- 🎨 **Role-Based Theming**: Automatic theme switching (Her, Him, Art) based on your database-assigned role.
- 🖥 **Native Experience**: Secured with custom Content Security Policies (CSP) for a safe desktop experience.

---

## 🛠 Tech Stack

- **Frontend**: React.js, TypeScript, Vite, Electron
- **Backend (API)**: Node.js (Express), MariaDB / MySQL
- **File Handling**: Multer (Image processing) & FS Promises (File system cleanup)
- **Security**: Bcrypt, Session Tokens, Strict CSP
- **i18n**: Custom JSON-based internationalization for themes and content.

---

## 🌐 Infrastructure and Deployment

This project is structured as a monorepo containing both the desktop frontend and the backend API server. All operations are managed via `make`.

### Quick Start (Makefile)

- `make dev`: Launches the local infrastructure (MariaDB and Backend via Docker) and starts the frontend development server.
- `make prod`: Launches the production infrastructure with the Cloudflare tunnel.
- `make clean`: Stops and removes all containers.
- `make seed`: Initializes the database with structure and default data.

### Backend Development in SSH

To recompile sources and recreate the backend container without affecting the database or stopping the Cloudflare tunnel:

- `make backend`

### Container Management

- `make ps`: View container status
- `make logs`: View backend logs in real-time
- `make restart`: Restart the Node.js API process
- `make down`: Stop all infrastructure cleanly
- `make up`: Start all infrastructure in the background

### Database Management

The database runs in isolation and stores persistent data in `./zatyshok-db-data`.

- `make db-shell`: Connect to MariaDB CLI (Root access)

- `make reset-db`: Complete database reset (Caution: deletes all data)

---

**2026 - Co Hai Se | All rights reserved**
