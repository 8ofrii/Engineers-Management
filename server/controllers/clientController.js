import prisma from '../lib/prisma.js';
import { auditFromReq } from '../lib/audit.js';

// @desc    Get all clients
// @route   GET /api/clients
// @access  Private
export const getClients = async (req, res, next) => {
    try {
        const clients = await prisma.client.findMany({
            where: {
                tenantId: req.user.tenantId,  // Tenant Isolation
                deletedAt: null               // Hide soft-deleted
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
                tenantId: req.user.tenantId,
                deletedAt: null
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

        await auditFromReq(req, {
            action: 'CREATE',
            entity: 'Client',
            entityId: client.id,
            after: client
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
        const before = await prisma.client.findFirst({
            where: { id: req.params.id, tenantId: req.user.tenantId, deletedAt: null }
        });

        if (!before) {
            return res.status(404).json({
                success: false,
                message: 'Client not found or authorized'
            });
        }

        const updatedClient = await prisma.client.update({
            where: { id: req.params.id },
            data: req.body
        });

        await auditFromReq(req, {
            action: 'UPDATE',
            entity: 'Client',
            entityId: updatedClient.id,
            before,
            after: updatedClient
        });

        res.status(200).json({
            success: true,
            data: updatedClient
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Soft-delete client (sets deletedAt; record kept for audit)
// @route   DELETE /api/clients/:id
// @access  Private
export const deleteClient = async (req, res, next) => {
    try {
        const before = await prisma.client.findFirst({
            where: { id: req.params.id, tenantId: req.user.tenantId, deletedAt: null }
        });

        if (!before) {
            return res.status(404).json({
                success: false,
                message: 'Client not found or authorized'
            });
        }

        await prisma.client.update({
            where: { id: req.params.id },
            data: { deletedAt: new Date() }
        });

        await auditFromReq(req, {
            action: 'DELETE',
            entity: 'Client',
            entityId: before.id,
            before
        });

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (error) {
        next(error);
    }
};
