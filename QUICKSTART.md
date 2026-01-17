# Civil Finance - Quick Start Guide

## Setup Instructions

### 1. Install Dependencies

**Server:**
```bash
cd server
npm install
```

**Client:**
```bash
cd client
npm install
```

### 2. Configure Environment

Copy the example environment file:
```bash
cd server
copy .env.example .env
```

Edit `.env` and set:
- `MONGODB_URI` - Your MongoDB connection string
- `JWT_SECRET` - A secure random string (e.g., use a password generator)

### 3. Start the Application

**Terminal 1 - Start Server:**
```bash
cd server
npm run dev
```

**Terminal 2 - Start Client:**
```bash
cd client
npm run dev
```

### 4. Access the Application

Open your browser and navigate to:
```
http://localhost:5173
```

Create an account and start managing your projects!

## Default Ports

- **Client**: http://localhost:5173
- **Server**: http://localhost:5000
- **MongoDB**: mongodb://localhost:27017 (if running locally)

## Need Help?

Check the main README.md for detailed documentation.
