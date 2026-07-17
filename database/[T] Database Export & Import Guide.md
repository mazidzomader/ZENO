# MongoDB Database Import & Export Guide

This guide explains how to export the entire MongoDB database and import it on another machine.

---

## Prerequisites

Install **MongoDB Database Tools**.

Verify the installation:

```powershell
mongodump --version
mongorestore --version
```

---

# Export Database

Open **PowerShell** in the project directory.

Export the database:

```powershell
mongodump --db zeno --out database
```

This creates the following structure:

```
database/
└── zeno/
    ├── users.bson
    ├── users.metadata.json
    ├── bookings.bson
    ├── bookings.metadata.json
    ├── payments.bson
    ├── payments.metadata.json
    └── ...
```

Commit and push the `database` folder to GitHub.

---

# Import Database

Pull the latest project from GitHub.

Open **PowerShell** in the project directory.

Restore the database:

```powershell
mongorestore --drop --db zeno database/zeno
```

The `--drop` flag removes existing collections before restoring.

---

# Verify Import

Open MongoDB Compass or Mongo Shell.

Confirm that:

- Database: `zeno`
- All collections exist.
- Documents are restored correctly.

---
