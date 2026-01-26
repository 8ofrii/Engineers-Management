import prisma from '../lib/prisma.js';

// @desc    Get Tenant Settings
// @route   GET /api/tenant
// @access  Private (Admin & Employees)
export const getTenant = async (req, res, next) => {
    try {
        const tenant = await prisma.tenant.findUnique({
            where: { id: req.user.tenantId }
        });

        if (!tenant) {
            return res.status(404).json({
                success: false,
                message: 'Tenant not found'
            });
        }

        res.status(200).json({
            success: true,
            data: tenant
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update Tenant Settings (Logo, Details)
// @route   PUT /api/tenant
// @access  Private (Admin Only)
export const updateTenant = async (req, res, next) => {
    try {
        const { name, address, phone, email } = req.body;

        // Check if user is Admin
        if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update company settings'
            });
        }

        const updateData = {};
        if (name) updateData.name = name;
        if (address) updateData.address = address;
        if (phone) updateData.phone = phone;
        if (email) updateData.email = email;

        // Handle Logo Upload
        if (req.file) {
            updateData.logo = `/uploads/images/${req.file.filename}`;
        }

        const tenant = await prisma.tenant.update({
            where: { id: req.user.tenantId },
            data: updateData
        });

        res.status(200).json({
            success: true,
            data: tenant,
            message: 'Company settings updated successfully'
        });
    } catch (error) {
        next(error);
    }
};
