# Hazard Hound

A community hazard reporting app that lets users pin, confirm, and resolve accessibility and safety hazards on a live map.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, react-leaflet, Leaflet |
| Backend | Node.js, Express |
| Database | MongoDB Atlas |
| Process manager | PM2 |
| Web server | nginx |

---

## Prerequisites

- [Node.js](https://nodejs.org/) v20 or higher
- A [MongoDB Atlas](https://www.mongodb.com/atlas) account with a cluster named `Hazard-Hound`
- Git

---

## Project Structure

```
HYGIENE_ACCESSIBILITY/
├── backend/          Express API server
│   ├── routes/       API route handlers
│   ├── scripts/      DB setup and seed scripts
│   ├── db.js         MongoDB connection
│   └── server.js     Entry point
├── frontend/         React app (Vite)
│   └── src/
└── setup-vultr.sh    Production server setup script
```

---

## Local Development Setup

### 1. Clone the repo

```bash
git clone https://github.com/Abdu5524-cpu/HYGIENE_ACCESSIBILITY
cd HYGIENE_ACCESSIBILITY
```

### 2. Backend

```bash
cd backend
npm install
```

Create a `.env` file (never committed — keep it secret):

```bash
cp .env.example .env
```

Edit `.env` and fill in your values:

```
MONGO_URI=mongodb+srv://<username>:<password>@hazard-hound.h8xedz3.mongodb.net/?appName=Hazard-Hound
PORT=3000
```

Set up database indexes (run once):

```bash
npm run setup-db
```

Seed the database with categories and conditions (run once):

```bash
npm run seed
```

Start the dev server (auto-restarts on file changes):

```bash
npm run dev
```

Backend runs at `http://localhost:3000`.

---

### 3. Frontend

```bash
cd frontend
npm install
```

Create a `.env` file:

```bash
cp .env.example .env
```

Edit `frontend/.env`:

```
VITE_API_URL=http://localhost:3000
```

> If running the frontend on a different machine than the backend, replace `localhost` with the backend machine's local IP (e.g. `http://10.104.11.233:3000`). Also add that origin to the CORS list in `backend/server.js`.

Start the dev server:

```bash
npm run dev
```

Frontend runs at `http://localhost:5173`.

---

## Environment Variables

### backend/.env

| Variable | Description |
|---|---|
| `MONGO_URI` | MongoDB Atlas connection string |
| `PORT` | Port the Express server listens on (default 3000) |

### frontend/.env

| Variable | Description |
|---|---|
| `VITE_API_URL` | Base URL of the backend API. Leave empty to use relative `/api/` paths (production with nginx). |

---

## Production Deployment (Vultr Ubuntu)

### First-time server setup

SSH into your server and run:

```bash
ssh root@YOUR_SERVER_IP
bash <(curl -s https://raw.githubusercontent.com/Abdu5524-cpu/HYGIENE_ACCESSIBILITY/main/setup-vultr.sh)
```

Or follow the steps manually:

```bash
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs git nginx

# Clone and install
git clone https://github.com/Abdu5524-cpu/HYGIENE_ACCESSIBILITY
cd HYGIENE_ACCESSIBILITY/backend
npm install

# Create .env (never commit this)
nano .env
# Add MONGO_URI and PORT=3000

# Set up DB (first time only)
npm run setup-db
npm run seed

# Start with PM2
npm install -g pm2
pm2 start server.js --name "hazard-hound"
pm2 startup
pm2 save
```

Configure nginx to serve the frontend and proxy `/api/` to Express — see `setup-vultr.sh` for the full nginx config block.

**Important:** Add your server's IP to MongoDB Atlas → Network Access before starting the server.

### Build and deploy the frontend

On your local machine:

```bash
cd frontend
# For production, leave VITE_API_URL empty so nginx handles routing
echo "VITE_API_URL=" > .env
npm run build
scp -r dist root@YOUR_SERVER_IP:/var/www/hazard-hound
```

### Deploy code updates

```bash
ssh root@YOUR_SERVER_IP
cd HYGIENE_ACCESSIBILITY/backend
git pull
npm install
pm2 restart hazard-hound
```

Then rebuild and re-upload the frontend from your local machine (see above).

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/users/login` | Sign in |
| POST | `/api/users` | Register |
| GET | `/api/users/:id` | Get user |
| PUT | `/api/users/:id` | Update user |
| POST | `/api/users/:id/conditions` | Add condition |
| DELETE | `/api/users/:id/conditions/:slug` | Remove condition |
| GET | `/api/reports` | Get all reports |
| GET | `/api/reports/nearby?lat=&lng=&radius=` | Get nearby reports |
| POST | `/api/reports` | Create report |
| POST | `/api/reports/:id/confirm` | Confirm report |
| POST | `/api/reports/:id/resolve` | Vote to resolve |
| GET | `/api/categories` | Get all categories |
| GET | `/api/conditions` | Get all conditions |
| GET | `/api/notifications/user/:userId` | Get user notifications |
