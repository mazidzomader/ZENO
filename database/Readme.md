# Database Setup Guide

This guide explains how to set up the MongoDB database for the **ZENO** project for the first time.

---

# Overview

The ZENO project uses a **local MongoDB database**.

The database backup is already included in this repository.

**You DO NOT need to create collections manually.**

**You DO NOT need to insert sample data manually.**

Everything is restored automatically.

---

# Requirements

Before starting, install the following software.

## 1. Git

Verify installation.

```powershell
git --version
```

---

## 2. MongoDB Community Server

This is the actual database server.

Verify installation.

```powershell
mongod --version
```

---

## 3. MongoDB Database Tools

This package contains:

* mongorestore
* mongodump
* mongoimport
* mongoexport

Verify installation.

```powershell
mongorestore --version
```

---

## 4. MongoDB Compass (Recommended)

Compass is the graphical interface used to view the database.

---

# Clone the Repository

Clone the project.

```powershell
git clone https://github.com/mazidzomader/ZENO.git
```

Move into the project folder.

```powershell
cd ZENO
```

---

# Project Structure

After cloning, your project should look similar to this.

```text
ZENO
│
├── backend
├── frontend
├── database
│   └── zeno
│       ├── bookings.bson
│       ├── bookings.metadata.json
│       ├── users.bson
│       ├── users.metadata.json
│       ├── vehicles.bson
│       ├── vehicles.metadata.json
│       └── ...
│
├── README.md
├── DATABASE_SETUP.md
└── ...
```

The important folder is

```text
database/
```

Do not delete or edit these files manually.

---

# Start MongoDB

MongoDB Server must be running before restoring the database.

## Check on Windows

Press

```
Windows Key
```

Search

```
Services
```

Open

```
Services
```

Find

```
MongoDB
```

Status should be

```
Running
```

If it is stopped

Right Click

```
Start
```

---

# Restore the Database

Open **PowerShell inside the project folder**.

Correct example

```text
C:\Users\User\Documents\GitHub\ZENO
```

Wrong example

```text
C:\Users\User\Documents\GitHub
```

Wrong example

```text
C:\Users\User\Documents\GitHub\ZENO\backend
```

Run

```powershell
mongorestore --drop database\zeno
```

---

# What does this command do?

```powershell
mongorestore --drop database\zeno
```

Explanation

| Part          | Meaning                                  |
| ------------- | ---------------------------------------- |
| mongorestore  | Restores a MongoDB backup                |
| --drop        | Deletes old collections before restoring |
| database\zeno | Location of the database backup          |

This command

* Creates the **zeno** database
* Creates every collection
* Imports every document
* Restores indexes (if included)
* Replaces previous data

---

# Verify the Database

Open MongoDB Compass.

Connect using

```
mongodb://localhost:27017
```

Click

```
Refresh
```

You should now see

```
zeno
```

Expand the database.

You should see collections similar to

```
bookings
buildings
cancellationrefunds
checkinouts
invoices
notifications
overstaypenalties
parkingslots
payments
reports
reviews
subscriptionplans
subscriptions
users
vehicles
```

If you can see these collections, the restore was successful.

---

# Common Errors

## mongorestore is not recognized

Example

```text
'mongorestore' is not recognized...
```

Reason

MongoDB Database Tools are not installed or not added to PATH.

Solution

Install MongoDB Database Tools.

---

## Connection refused

Reason

MongoDB Server is not running.

Solution

Start the MongoDB service.

---

## Database not appearing in Compass

Reason

Compass is connected to the wrong server.

Solution

Connect to

```
mongodb://localhost:27017
```

Refresh Compass.

---

## Database already exists

This is not an error.

The

```
--drop
```

option automatically removes old collections before restoring the latest backup.

---

# Frequently Asked Questions

## Do I need to restore every time I run the project?

No.

Restore only

* when setting up the project for the first time
* when you pull a newer database backup from GitHub

---

## Can I edit the BSON files?

No.

These are backup files.

Always modify the database through the application or MongoDB Compass.

---

## Where is the actual database stored?

The MongoDB server stores it locally on your computer.

The `database/zeno` folder inside the repository is only a backup.

---

## Why is the backup stored in GitHub?

So every team member works with the exact same database.

---

## Do I need MongoDB Compass?

No.

It is optional.

It simply makes it easier to view the database.

---

# First-Time Setup Summary

Clone the repository.

```powershell
git clone https://github.com/mazidzomader/ZENO.git
```

Enter the project.

```powershell
cd ZENO
```

Restore the database.

```powershell
mongorestore --drop database\zeno
```

Start the backend.

```powershell
cd backend
npm install
npm run dev
```

Start the frontend.

```powershell
cd ../frontend
npm install
npm start
```

The project is now ready to use.

---

