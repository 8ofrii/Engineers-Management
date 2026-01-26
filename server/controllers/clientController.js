import prisma from '../lib/prisma.js';

// @desc    Get all clients
// @route   GET /api/clients
// @access  Private
export const getClients = async (req, res, next) => {
    try {
        const clients = await prisma.client.findMany({
            where: {
                tenantId: req.user.tenantId // Tenant Isolation
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        res.status(200).json({
            success: true,
            count: clients.length,
            data: clients
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single client
// @route   GET /api/clients/:id
// @access  Private
export const getClient = async (req, res, next) => {
    try {
        const client = await prisma.client.findFirst({
            where: {
                id: req.params.id,
                tenantId: req.user.tenantId
            },
            include: {
                projects: true
            }
        });

        if (!client) {
            return res.status(404).json({
                success: false,
                message: 'Client not found'
            });
        }

        res.status(200).json({
            success: true,
            data: client
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Create client
// @route   POST /api/clients
// @access  Private
export const createClient = async (req, res, next) => {
    try {
        const client = await prisma.client.create({
            data: {
                ...req.body,
                tenantId: req.user.tenantId // Critical: Assign to Tenant
            }
        });

        res.status(201).json({
            success: true,
            data: client
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update client
// @route   PUT /api/clients/:id
// @access  Private
export const updateClient = async (req, res, next) => {
    try {
        const client = await prisma.client.updateMany({
            where: {
                id: req.params.id,
                tenantId: req.user.tenantId // Ensure ownership
            },
            data: req.body
        });

        if (client.count === 0) {
            return res.status(404).json({
                success: false,
                message: 'Client not found or authorized'
            });
        }

        // Fetch updated
        const updatedClient = await prisma.client.findFirst({
            where: { id: req.params.id }
        });

        res.status(200).json({
            success: true,
            data: updatedClient
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete client
// @route   DELETE /api/clients/:id
// @access  Private
export const deleteClient = async (req, res, next) => {
    try {
        const result = await prisma.client.deleteMany({
            where: {
                id: req.params.id,
                tenantId: req.user.tenantId
            }
        });

        if (result.count === 0) {
            return res.status(404).json({
                success: false,
                message: 'Client not found or authorized'
            });
        }

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (error) {
        next(error);
    }
};
