# Civil Engineers Financial Management System - Server

## Overview
Backend API for managing civil engineering projects, clients, suppliers, and financial transactions with conversational data entry support.

## Features
- 🔐 JWT Authentication
- 👥 User Management
- 📊 Project Management
- 💰 Transaction Tracking
- 🏢 Client Management
- 🏭 Supplier Management
- 💬 Chat Interface (Text & Audio)
- 📈 Financial Reports & Statistics

## Tech Stack
- Node.js
- Express.js
- MongoDB with Mongoose
- JWT for authentication
- Multer for file uploads

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Create a `.env` file in the server directory:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/civil-finance
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads
CLIENT_URL=http://localhost:5173
```

### 3. Start MongoDB
Make sure MongoDB is running on your system.

### 4. Run the Server
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (Protected)

### Projects
- `GET /api/projects` - Get all projects (Protected)
- `GET /api/projects/:id` - Get single project (Protected)
- `POST /api/projects` - Create project (Protected)
- `PUT /api/projects/:id` - Update project (Protected)
- `DELETE /api/projects/:id` - Delete project (Protected)
- `POST /api/projects/:id/notes` - Add note to project (Protected)

### Transactions
- `GET /api/transactions` - Get all transactions (Protected)
- `GET /api/transactions/stats` - Get transaction statistics (Protected)
- `GET /api/transactions/:id` - Get single transaction (Protected)
- `POST /api/transactions` - Create transaction (Protected)
- `PUT /api/transactions/:id` - Update transaction (Protected)
- `DELETE /api/transactions/:id` - Delete transaction (Protected)

### Clients
- `GET /api/clients` - Get all clients (Protected)
- `GET /api/clients/:id` - Get single client (Protected)
- `POST /api/clients` - Create client (Protected)
- `PUT /api/clients/:id` - Update client (Protected)
- `DELETE /api/clients/:id` - Delete client (Protected)

### Suppliers
- `GET /api/suppliers` - Get all suppliers (Protected)
- `GET /api/suppliers/:id` - Get single supplier (Protected)
- `POST /api/suppliers` - Create supplier (Protected)
- `PUT /api/suppliers/:id` - Update supplier (Protected)
- `DELETE /api/suppliers/:id` - Delete supplier (Protected)

### Chat
- `GET /api/chat` - Get chat messages (Protected)
- `POST /api/chat/text` - Send text message (Protected)
- `POST /api/chat/audio` - Send audio message (Protected)

## Audio Transcription Integration

The chat controller is ready for audio transcription integration. To add transcription:

1. Choose a service (e.g., OpenAI Whisper, Google Speech-to-Text, AssemblyAI)
2. Install the SDK: `npm install openai` (for Whisper)
3. Update `chatController.js` to process audio files
4. Add API keys to `.env`

Example Whisper integration:
```javascript
import OpenAI from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const transcription = await openai.audio.transcriptions.create({
  file: fs.createReadStream(audioPath),
  model: "whisper-1",
});
```

## Database Models

### User
- name, email, password, role, company, phone, isActive

### Project
- name, description, client, status, startDate, endDate, budget, actualCost, location, projectType, engineer, documents, notes

### Transaction
- project, type (income/expense), category, amount, description, date, supplier, client, paymentMethod, invoiceNumber, status, attachments

### Client
- name, email, phone, company, address, contactPerson, taxId, paymentTerms, status

### Supplier
- name, email, phone, company, address, category, taxId, paymentTerms, rating, status

### ChatMessage
- user, messageType (text/audio), content, audioUrl, transcript, intent, extractedData, processed, response

## License
ISC
