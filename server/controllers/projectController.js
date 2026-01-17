import prisma from '../lib/prisma.js';

// @desc    Get all projects
// @route   GET /api/projects
// @access  Private
export const getProjects = async (req, res, next) => {
    try {
        const projects = await prisma.project.findMany({
            where: {
                engineerId: req.user.id
            },
            include: {
                client: true,
                engineer: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        res.status(200).json({
            success: true,
            count: projects.length,
            data: projects
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single project
// @route   GET /api/projects/:id
// @access  Private
export const getProject = async (req, res, next) => {
    try {
        const project = await prisma.project.findUnique({
            where: { id: req.params.id },
            include: {
                client: true,
                engineer: true,
                notes: true
            }
        });

        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        // Check ownership
        if (project.engineerId !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to access this project'
            });
        }

        res.status(200).json({
            success: true,
            data: project
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Create project
// @route   POST /api/projects
// @access  Private
export const createProject = async (req, res, next) => {
    try {
        const project = await prisma.project.create({
            data: {
                ...req.body,
                engineerId: req.user.id
            },
            include: {
                client: true
            }
        });

        res.status(201).json({
            success: true,
            data: project
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private
export const updateProject = async (req, res, next) => {
    try {
        const project = await prisma.project.findUnique({
            where: { id: req.params.id }
        });

        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        // Check ownership
        if (project.engineerId !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this project'
            });
        }

        const updatedProject = await prisma.project.update({
            where: { id: req.params.id },
            data: req.body,
            include: {
                client: true
            }
        });

        res.status(200).json({
            success: true,
            data: updatedProject
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private
export const deleteProject = async (req, res, next) => {
    try {
        const project = await prisma.project.findUnique({
            where: { id: req.params.id }
        });

        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        // Check ownership
        if (project.engineerId !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this project'
            });
        }

        await prisma.project.delete({
            where: { id: req.params.id }
        });

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (error) {
        next(error);
    }
};
