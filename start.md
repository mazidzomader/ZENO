# ZENO — Project Startup Guide

A step-by-step guide to get the ZENO parking rental management system running locally.

---

## Prerequisites

Make sure all of the following are installed on your machine before continuing.

| Tool | Required Version | Verify Command |
|---|---|---|
| Node.js | v18 or later | `node --version` |
| npm | v9 or later | `npm --version` |
| MongoDB Community Server | v6 or later | `mongod --version` |
| MongoDB Database Tools | Any | `mongorestore --version` |

> **MongoDB Compass** is optional but recommended if you want a visual way to inspect the database.
> Download it at: https://www.mongodb.com/try/download/compass

---

## Step 1 — Verify MongoDB is Running

ZENO uses a local MongoDB server. It must be running before you start the backend.

1. Press **Windows Key**, search for **Services**, and open it.
2. Find **MongoDB** in the list.
3. The **Status** column must say **Running**.
4. If it says **Stopped**, right-click it and select **Start**.

---

## Step 2 — Restore the Database

This only needs to be done **once** (or whenever you want to reset data to the original seed).

Open **PowerShell** inside the project root folder (`ZENO/`) and run:

```powershell
mongorestore --db zeno --drop database\zeno
```

> ⚠️ **Important:** This command must be run from the **root of the project** (`ZENO/`), not from inside `backend/` or `frontend/`. If you see `"cannot find path"`, you are in the wrong folder.

You should see output ending with:

```
17 document(s) restored successfully. 0 document(s) failed to restore.
```

---

## Step 3 — Start the Backend

Open a **new PowerShell terminal** window. Navigate into the `backend` folder and start the server:

```powershell
cd backend
npm install       # only needed the first time, or after pulling new changes
npm run dev
```

The backend is running correctly when you see:

```
Server running on port 5000
MongoDB Connected: localhost
```

The backend runs on: **http://localhost:5000**

> Keep this terminal window open while using the app.

---

## Step 4 — Start the Frontend

Open a **second new PowerShell terminal** window. Navigate into the `frontend` folder:

```powershell
cd frontend
npm install       # only needed the first time, or after pulling new changes
npm run dev
```

The frontend is ready when you see:

```
VITE ready in ...ms

  ➜  Local:   http://localhost:5173/
```

Open your browser and go to: **http://localhost:5173**

> Keep this terminal window open while using the app.

---

## Step 5 — Log In

> ℹ️ The seed accounts (`admin@zeno.com`, `owner@zeno.com`, `renter@zeno.com`) use a placeholder password hash in the database backup and cannot be logged into directly.
>
> **Use the Sign Up page to register your own account** and log in with those credentials immediately.

---

## Environment Variables

The backend reads configuration from `backend/.env`. It is already set up for local development:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/zeno
JWT_SECRET=zeno_secret_key_2026
```

Do not commit changes to this file. If you need a different configuration, update the values as needed.

---

## Project Structure

```
ZENO/
├── backend/          ← Express.js API server (port 5000)
│   ├── config/       ← Database connection (db.js)
│   ├── controllers/  ← Route handler logic
│   ├── middleware/   ← Auth middleware (JWT protect + role authorize)
│   ├── models/       ← Mongoose schemas
│   ├── routes/       ← API route definitions
│   ├── .env          ← Environment variables (do not commit secrets)
│   └── server.js     ← Entry point
│
├── frontend/         ← React + Vite app (port 5173)
│   └── src/
│       ├── context/  ← Auth context
│       ├── pages/    ← Page components
│       ├── routes/   ← App routing
│       └── services/ ← Axios API client
│
└── database/         ← MongoDB backup (BSON files)
    └── zeno/         ← Used with mongorestore
```

---

## API Endpoints (Quick Reference)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| POST | `/api/auth/register` | Register a new user | No |
| POST | `/api/auth/login` | Log in and receive a JWT | No |
| GET | `/api/auth/profile` | Get current user profile | Yes |
| GET | `/api/slots` | List all parking slots | No |
| GET | `/api/buildings` | List all buildings | No |
| GET | `/api/db/:collection` | View a database collection (role-filtered) | Yes |

---

## Common Errors & Fixes

### `npm error Missing script: "dev"`
You are in the wrong directory. Make sure you are inside either `backend/` or `frontend/`, **not** the root `ZENO/` folder.

### `mongorestore: cannot find path`
You ran `mongorestore` from the wrong folder. Run it from the project **root** (`ZENO/`):
```powershell
cd C:\Users\<your-name>\Documents\GitHub\ZENO
mongorestore --db zeno --drop database\zeno
```

### `MongoDB Connection Failed` (backend)
The MongoDB service is not running. Go to **Windows Services** and start the **MongoDB** service.

### `401 Unauthorized` on API calls
Your session has expired or you are not logged in. Log in again through the frontend.

---

## Stopping the Servers

To stop either server, click on its terminal window and press:

```
Ctrl + C
```

---

## Running Again After a Restart

You do **not** need to restore the database again unless you want to reset data. Just:

1. Make sure MongoDB is running (Step 1).
2. Start the backend (Step 3).
3. Start the frontend (Step 4).
