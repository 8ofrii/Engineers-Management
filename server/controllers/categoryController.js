import { getAllCategories, getCategoriesByGroup, findCategoryByArabic } from '../constants/arabicCategories.js';

/**
 * @desc    Get all transaction categories
 * @route   GET /api/categories
 * @access  Private
 */
export const getCategories = async (req, res, next) => {
    try {
        const { grouped, language } = req.query;

        if (grouped === 'true') {
            // Return grouped by type (MATERIALS, LABOR, SERVICES)
            const categoriesByGroup = getCategoriesByGroup();

            // Format for frontend
            const formatted = Object.entries(categoriesByGroup).map(([groupKey, items]) => ({
                group: groupKey,
                groupNameAr: groupKey === 'MATERIALS' ? 'خامات' :
                    groupKey === 'LABOR' ? 'مصنعية' : 'أخرى',
                groupNameEn: groupKey === 'MATERIALS' ? 'Materials' :
                    groupKey === 'LABOR' ? 'Labor' : 'Services',
                items: items // items is already an array of {key, ar, en, group}
            }));

            return res.status(200).json({
                success: true,
                data: formatted
            });
        }

        // Return flat list
        const categories = getAllCategories();

        res.status(200).json({
            success: true,
            count: categories.length,
            data: categories
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Search category by Arabic name
 * @route   GET /api/categories/search
 * @access  Private
 */
export const searchCategory = async (req, res, next) => {
    try {
        const { q } = req.query;

        if (!q) {
            return res.status(400).json({
                success: false,
                message: 'Search query required'
            });
        }

        const category = findCategoryByArabic(q);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        res.status(200).json({
            success: true,
            data: category
        });
    } catch (error) {
        next(error);
    }
};

export default {
    getCategories,
    searchCategory
};
