<p align="center">
    <a href="https://notmazidzomader.github.io/ZENO/" target="_blank">
        <img src="https://github.com/mazidzomader/ScrapRepo/blob/main/hero.png" alt="Zeno" />
    </a>
</p>

<div align="center"> 
    
## Project Description
 
***ZENO*** is a web-based parking area rental and management platform built for residential and commercial buildings. It replaces the manual, error-prone process of tracking parking slots on spreadsheets or paper logs with a centralized system that lets building administrators, slot owners, and renters interact through one application.

</div>

---

> 📌 Project developed as part of **CSE470: Software Engineering** at **BRAC University**, Summer 2026.

---

<p align="center">
  <!-- Stack -->
  <img src="https://img.shields.io/badge/Stack-MERN-success" alt="MERN Stack" />
  <!-- MongoDB -->
  <img src="https://img.shields.io/badge/MongoDB-47A248?logo=mongodb&logoColor=white" alt="MongoDB" />
  <!-- Express -->
  <img src="https://img.shields.io/badge/Express.js-000000?logo=express&logoColor=white" alt="Express.js" />
  <!-- React -->
  <img src="https://img.shields.io/badge/React%2019-20232A?logo=react&logoColor=61DAFB" alt="React" />
  <!-- Node -->
  <img src="https://img.shields.io/badge/Node.js-339933?logo=node.js&logoColor=white" alt="Node.js" />
  <br>
  <!-- Vite -->
  <img src="https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white" alt="Vite" />
  <!-- Tailwind CSS -->
  <img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <!-- JWT -->
  <img src="https://img.shields.io/badge/JWT-black?logo=jsonwebtokens" alt="JWT" />
  <!-- Stripe -->
  <img src="https://img.shields.io/badge/Stripe-635BFF?logo=stripe&logoColor=white" alt="Stripe" />
  <!-- Leaflet -->
  <img src="https://img.shields.io/badge/Leaflet-199900?logo=leaflet&logoColor=white" alt="Leaflet" />
  <!-- PDFKit -->
  <img src="https://img.shields.io/badge/PDFKit-FF4B4B" alt="PDFKit" />
</p>

## Getting Started & Setup

Follow these steps to get the project up and running locally.

### Prerequisites

Ensure you have the following installed on your machine:
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [MongoDB](https://www.mongodb.com/) (Local instance or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster)

---

### 1. Clone the Repository

```bash
git clone https://github.com/mazidzomader/ZENO.git
cd ZENO
```

---

### 2. Backend Setup

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```

2. Install backend dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the `backend` directory (you can copy `.env.example`):
   ```bash
   cp .env.example .env
   ```

4. Configure the environment variables inside `.env`:
   ```env
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   STRIPE_SECRET_KEY=your_stripe_secret_key
   CLIENT_URL=http://localhost:5173

   # Optional: Email notification settings (defaults to Ethereal test inbox if omitted)
   # EMAIL_HOST=smtp.gmail.com
   # EMAIL_PORT=587
   # EMAIL_USER=your-email@gmail.com
   # EMAIL_PASS=your-app-password
   # EMAIL_FROM=noreply@zeno.com
   ```

5. Start the backend development server:
   ```bash
   npm run dev
   ```
   *The server will start on `http://localhost:5000`.*

---

### 3. Frontend Setup

1. Open a new terminal and navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```

2. Install frontend dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *The client will be running at `http://localhost:5173`.*

---

## Contributors

This project exists thanks to all the people who contribute.
<div align="center"> 
    
| Student ID | Name |
|---|---|
| 24241189 | Abdullah Al Mazid Zomader |
| 23201003 | Masrur Sarar |
| 22299250 | Sraboni Din Awal |
| 22299058 | Arobi Al Amin Twinkle |
<br>
<p align="center">
  <a href="https://github.com/mazidzomader"><img src="https://github.com/mazidzomader.png" width="60" height="60" style="border-radius:50%"/></a>
  <a href="https://github.com/awalsra"><img src="https://github.com/awalsra.png" width="60" height="60" style="border-radius:50%"/></a>
  <a href="https://github.com/arobi-alamin"><img src="https://github.com/arobi-alamin.png" width="60" height="60" style="border-radius:50%"/></a> 
  <a href="https://github.com/ConquerCommand"><img src="https://github.com/ConquerCommand.png" width="60" height="60" style="border-radius:50%"/></a>
</p>
</div>

## License

Licensed under the MIT License, Copyright © 2026-present.