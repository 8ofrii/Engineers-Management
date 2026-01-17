# Engineers Management System

A comprehensive Construction ERP system for managing engineering projects, clients, suppliers, and financial transactions with full Arabic/English support.

## 🌟 Features

- ✅ **Bilingual Support** - Full Arabic/English with RTL layout
- ✅ **Authentication** - Secure JWT-based auth with role-based access (Admin, Engineer, Accountant)
- ✅ **Project Management** - Track projects, budgets, and costs
- ✅ **Client & Supplier Management** - Manage business relationships
- ✅ **Financial Tracking** - Monitor transactions, income, and expenses
- ✅ **Reports & Analytics** - Visual charts and financial insights
- ✅ **Dark/Light Mode** - Modern UI with theme switching
- ✅ **Mobile Responsive** - Works perfectly on all devices

## 🚀 Tech Stack

### Frontend
- **React** with Vite
- **React Router** for navigation
- **Axios** for API calls
- **Recharts** for data visualization
- **i18next** for internationalization
- **Lucide React** for icons

### Backend
- **Node.js** with Express
- **PostgreSQL** database
- **Prisma ORM** for database management
- **JWT** for authentication
- **bcryptjs** for password hashing

## 📦 Installation

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL database
- npm or yarn

### Setup

1. **Clone the repository**
```bash
git clone https://github.com/8ofrii/Engineers-Management.git
cd Engineers-Management
```

2. **Install dependencies**
```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

3. **Configure environment variables**

Create `server/.env`:
```env
PORT=5000
NODE_ENV=development
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require"
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRE=30d
CLIENT_URL=http://localhost:5173
```

4. **Setup database**
```bash
cd server
npx prisma generate
npx prisma db push
npx prisma db seed
```

5. **Run the application**

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd client
npm run dev
```

6. **Access the app**
- Frontend: http://localhost:5173
- Backend: http://localhost:5000

## 🔐 Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@construction.com | password123 |
| Engineer | engineer@construction.com | password123 |
| Accountant | accountant@construction.com | password123 |

## 📱 Features Overview

### Dashboard
- Project statistics
- Financial overview
- Income vs Expenses charts
- Recent projects list

### Projects
- Create and manage projects
- Track budgets and actual costs
- Project status tracking
- Client assignment

### Clients & Suppliers
- Contact management
- Company information
- Status tracking

### Transactions
- Income and expense tracking
- Category-based organization
- Financial reports

### Reports
- Visual analytics
- Income vs Expenses charts
- Category breakdowns

## 🌐 Language Support

Switch between English and Arabic from the dashboard:
- Click the **🌐 EN/AR** button
- Full RTL support for Arabic
- All UI elements translated

## 🎨 Theme Support

Toggle between light and dark modes:
- Click the **☀️/🌙** button on dashboard
- Theme persists across all pages

## 📂 Project Structure

```
Engineers-Management/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── context/       # React context
│   │   ├── services/      # API services
│   │   ├── locales/       # Translation files
│   │   └── utils/         # Utility functions
│   └── package.json
├── server/                # Node.js backend
│   ├── controllers/       # Route controllers
│   ├── routes/            # API routes
│   ├── middleware/        # Express middleware
│   ├── prisma/            # Prisma schema & migrations
│   └── package.json
└── README.md
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Projects
- `GET /api/projects` - Get all projects
- `POST /api/projects` - Create project
- `GET /api/projects/:id` - Get project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Clients
- `GET /api/clients` - Get all clients
- `POST /api/clients` - Create client
- `GET /api/clients/:id` - Get client
- `PUT /api/clients/:id` - Update client
- `DELETE /api/clients/:id` - Delete client

### Suppliers
- `GET /api/suppliers` - Get all suppliers
- `POST /api/suppliers` - Create supplier
- `GET /api/suppliers/:id` - Get supplier
- `PUT /api/suppliers/:id` - Update supplier
- `DELETE /api/suppliers/:id` - Delete supplier

### Transactions
- `GET /api/transactions` - Get all transactions
- `GET /api/transactions/stats` - Get statistics
- `POST /api/transactions` - Create transaction
- `GET /api/transactions/:id` - Get transaction
- `PUT /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 👨‍💻 Author

**8ofrii**

## 🙏 Acknowledgments

- Built with modern web technologies
- Designed for construction and engineering businesses
- Supports Arabic-speaking markets with full RTL support
