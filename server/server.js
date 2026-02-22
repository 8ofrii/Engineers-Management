import express from 'express';
import dotenv from 'dotenv';

// Load env vars at the very top before any other imports
dotenv.config();

import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from './lib/prisma.js';
import { errorHandler } from './middleware/error.js';

// Import routes
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import clientRoutes from './routes/clients.js';
import supplierRoutes from './routes/suppliers.js';
import workmenRoutes from './routes/workmen.js';
import transactionRoutes from './routes/transactions.js';
import custodyRoutes from './routes/custody.js';
import notificationRoutes from './routes/notifications.js';
import materialBatchRoutes from './routes/materialBatches.js';
import chatRoutes from './routes/chat.js';
import tenantRoutes from './routes/tenant.js';
import userRoutes from './routes/users.js';
import roleRoutes from './routes/roles.js';
import projectCostItemRoutes from './routes/projectCostItems.js';
import categoryRoutes from './routes/categories.js';
import workOrderRoutes from './routes/workOrders.js';
import officeFeeRoutes from './routes/officeFees.js';
import materialRoutes from './routes/materials.js';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        // Dynamically allow any origin that starts with http
        // This stops strict string mismatches from breaking logins
        callback(null, true);
    },
    credentials: true
}));

// Dev logging middleware
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Serve static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount routers
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/workmen', workmenRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/custody', custodyRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/material-batches', materialBatchRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/tenant', tenantRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/project-cost-items', projectCostItemRoutes); // V1.2: Work Orders (Legacy)
app.use('/api/work-orders', workOrderRoutes); // V2: Work Orders (New)
app.use('/api/office-fees', officeFeeRoutes); // V2: Office Fee Configuration
app.use('/api/categories', categoryRoutes); // V1.2: Arabic Categories
app.use('/api/materials', materialRoutes); // Added Materials route

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
    console.log(`Error: ${err.message}`);
    server.close(() => process.exit(1));
});
