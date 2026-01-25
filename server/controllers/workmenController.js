import prisma from '../lib/prisma.js';

// @desc    Get all workmen
// @route   GET /api/workmen
// @access  Private
export const getAll = async (req, res, next) => {
    try {
        const workmen = await prisma.workman.findMany({
            orderBy: { createdAt: 'desc' }
        });

        res.status(200).json({
            success: true,
            data: workmen
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single workman
// @route   GET /api/workmen/:id
// @access  Private
export const getOne = async (req, res, next) => {
    try {
        const workman = await prisma.workman.findUnique({
            where: { id: req.params.id },
            include: {
                workmanships: true,
                transactions: {
                    orderBy: { createdAt: 'desc' },
                    take: 10
                }
            }
        });

        if (!workman) {
            return res.status(404).json({
                success: false,
                message: 'Workman not found'
            });
        }

        res.status(200).json({
            success: true,
            data: workman
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Create new workman
// @route   POST /api/workmen
// @access  Private
export const create = async (req, res, next) => {
    try {
        const { name, nameAr, trade, dailyRate, phone, nationalId } = req.body;

        const workman = await prisma.workman.create({
            data: {
                name,
                nameAr,
                trade,
                dailyRate,
                phone,
                nationalId
            }
        });

        res.status(201).json({
            success: true,
            data: workman
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update workman
// @route   PUT /api/workmen/:id
// @access  Private
export const update = async (req, res, next) => {
    try {
        const { name, nameAr, trade, dailyRate, phone, nationalId, isActive } = req.body;

        const workman = await prisma.workman.update({
            where: { id: req.params.id },
            data: {
                name,
                nameAr,
                trade,
                dailyRate,
                phone,
                nationalId,
                isActive
            }
        });

        res.status(200).json({
            success: true,
            data: workman
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete workman
// @route   DELETE /api/workmen/:id
// @access  Private
export const deleteWorkman = async (req, res, next) => {
    try {
        await prisma.workman.delete({
            where: { id: req.params.id }
        });

        res.status(200).json({
            success: true,
            message: 'Workman deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};
