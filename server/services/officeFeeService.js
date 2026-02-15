import prisma from '../lib/prisma.js';

/**
 * Get office fee percentage for a transaction
 * Priority: Project Category Override > Global Category Default > Project General Fee > System Default
 * 
 * @param {string} projectId - The project ID
 * @param {string} category - The transaction category
 * @returns {Promise<number>} - The office fee percentage
 */
export const getOfficeFeePercent = async (projectId, category) => {
    try {
        // 1. Check project-specific category fee override
        const projectCategoryFee = await prisma.projectCategoryFee.findFirst({
            where: {
                projectId,
                category
            }
        });

        if (projectCategoryFee) {
            return Number(projectCategoryFee.feePercent);
        }

        // 2. Check global category default
        const globalCategoryFee = await prisma.globalCategoryFee.findFirst({
            where: { category }
        });

        if (globalCategoryFee) {
            return Number(globalCategoryFee.defaultFeePercent);
        }

        // 3. Use project's general management fee
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            select: { managementFeePercent: true }
        });

        if (project?.managementFeePercent) {
            return Number(project.managementFeePercent);
        }

        // 4. System default fallback
        return 20;

    } catch (error) {
        console.error('Error getting office fee percent:', error);
        return 20; // Fallback to default on error
    }
};

/**
 * Check if a category is an inventory/material type
 * Inventory categories don't get office fee until material is used
 * 
 * @param {string} category - The transaction category
 * @returns {boolean} - True if inventory category
 */
export const isInventoryCategory = (category) => {
    const inventoryCategories = [
        'CEMENT',
        'SAND',
        'BRICKS',
        'CONCRETE',
        'PLASTERING_MATERIALS',
        'PLUMBING_MATERIALS',
        'ELECTRICAL_MATERIALS',
        'CERAMIC_MATERIALS',
        'PAINTING_MATERIALS',
        'GYPSUM_MATERIALS',
        'CARPENTRY_MATERIALS',
        'MATERIALS' // Generic materials category
    ];

    return inventoryCategories.includes(category);
};

/**
 * Calculate office fee for an expense
 * 
 * @param {string} projectId - The project ID
 * @param {string} category - The transaction category
 * @param {number} amount - The transaction amount
 * @returns {Promise<number>} - The calculated office fee
 */
export const calculateOfficeFee = async (projectId, category, amount) => {
    try {
        const feePercent = await getOfficeFeePercent(projectId, category);
        const fee = Number(amount) * (feePercent / 100);
        return Math.round(fee * 100) / 100; // Round to 2 decimal places
    } catch (error) {
        console.error('Error calculating office fee:', error);
        return 0;
    }
};

/**
 * Get all office fee configurations for a project
 * 
 * @param {string} projectId - The project ID
 * @returns {Promise<Object>} - Object containing project fees and global defaults
 */
export const getProjectOfficeFees = async (projectId) => {
    try {
        const [project, projectCategoryFees, globalCategoryFees] = await Promise.all([
            prisma.project.findUnique({
                where: { id: projectId },
                select: { managementFeePercent: true }
            }),
            prisma.projectCategoryFee.findMany({
                where: { projectId }
            }),
            prisma.globalCategoryFee.findMany()
        ]);

        return {
            projectGeneralFee: project?.managementFeePercent ? Number(project.managementFeePercent) : null,
            projectCategoryFees: projectCategoryFees.map(f => ({
                category: f.category,
                feePercent: Number(f.feePercent)
            })),
            globalCategoryFees: globalCategoryFees.map(f => ({
                category: f.category,
                defaultFeePercent: Number(f.defaultFeePercent)
            }))
        };
    } catch (error) {
        console.error('Error getting project office fees:', error);
        return {
            projectGeneralFee: null,
            projectCategoryFees: [],
            globalCategoryFees: []
        };
    }
};

/**
 * Set or update a project-specific category fee
 * 
 * @param {string} projectId - The project ID
 * @param {string} category - The transaction category
 * @param {number} feePercent - The fee percentage
 * @param {string} tenantId - The tenant ID
 * @returns {Promise<Object>} - The created/updated fee configuration
 */
export const setProjectCategoryFee = async (projectId, category, feePercent, tenantId) => {
    try {
        return await prisma.projectCategoryFee.upsert({
            where: {
                projectId_category: {
                    projectId,
                    category
                }
            },
            update: {
                feePercent
            },
            create: {
                projectId,
                category,
                feePercent,
                tenantId
            }
        });
    } catch (error) {
        console.error('Error setting project category fee:', error);
        throw error;
    }
};

/**
 * Set or update a global category fee default
 * 
 * @param {string} category - The transaction category
 * @param {number} defaultFeePercent - The default fee percentage
 * @param {string} tenantId - The tenant ID
 * @returns {Promise<Object>} - The created/updated fee configuration
 */
export const setGlobalCategoryFee = async (category, defaultFeePercent, tenantId) => {
    try {
        return await prisma.globalCategoryFee.upsert({
            where: {
                category
            },
            update: {
                defaultFeePercent
            },
            create: {
                category,
                defaultFeePercent,
                tenantId
            }
        });
    } catch (error) {
        console.error('Error setting global category fee:', error);
        throw error;
    }
};

/**
 * Delete a project-specific category fee override
 * 
 * @param {string} projectId - The project ID
 * @param {string} category - The transaction category
 * @returns {Promise<Object>} - The deleted fee configuration
 */
export const deleteProjectCategoryFee = async (projectId, category) => {
    try {
        return await prisma.projectCategoryFee.delete({
            where: {
                projectId_category: {
                    projectId,
                    category
                }
            }
        });
    } catch (error) {
        console.error('Error deleting project category fee:', error);
        throw error;
    }
};
