import prisma from '../lib/prisma.js';
import { auditFromReq } from '../lib/audit.js';

// Map an uploaded multer file → its public URL. Mirrors the pattern used
// elsewhere (S3 sets `file.location`; local fallback uses /uploads/images/<filename>).
const fileToUrl = (file) => file?.location || (file?.filename ? `/uploads/images/${file.filename}` : null);

// @desc    List documents for a project (most-recent first).
// @route   GET /api/projects/:projectId/documents
// @access  Private (any tenant member with project access)
export const listDocuments = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const { category } = req.query;

        const project = await prisma.project.findFirst({
            where: { id: projectId, tenantId: req.user.tenantId, deletedAt: null }
        });
        if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

        const docs = await prisma.document.findMany({
            where: {
                projectId,
                tenantId: req.user.tenantId,
                ...(category ? { category } : {})
            },
            include: {
                uploader: { select: { id: true, name: true, email: true } }
            },
            orderBy: { uploadedAt: 'desc' }
        });

        res.status(200).json({
            success: true,
            count: docs.length,
            data: docs.map(d => ({
                ...d,
                latitude: d.latitude == null ? null : Number(d.latitude),
                longitude: d.longitude == null ? null : Number(d.longitude)
            }))
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Upload a document/photo to a project.
// @route   POST /api/projects/:projectId/documents
// @access  Private (multipart: file=image, plus optional fields)
//
// Multipart fields:
//   file         (required) — the image
//   name         (optional) — display name; defaults to filename
//   category     (optional) — DocumentCategory; defaults to OTHER
//   description  (optional)
//   latitude     (optional) — GPS lat from camera
//   longitude    (optional) — GPS lng from camera
//   takenAt      (optional) — ISO date string from EXIF
export const uploadDocument = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const project = await prisma.project.findFirst({
            where: { id: projectId, tenantId: req.user.tenantId, deletedAt: null }
        });
        if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

        const url = fileToUrl(req.file);
        if (!url) return res.status(500).json({ success: false, message: 'Upload failed: no file URL' });

        const { name, category, description, latitude, longitude, takenAt } = req.body;

        // Validate category if provided
        const allowedCategories = [
            'PHOTO_PROGRESS', 'PHOTO_RECEIPT', 'PHOTO_DELIVERY', 'PHOTO_ISSUE',
            'CONTRACT', 'PERMIT', 'DRAWING', 'REPORT', 'OTHER'
        ];
        if (category && !allowedCategories.includes(category)) {
            return res.status(400).json({ success: false, message: `Invalid category. Must be one of: ${allowedCategories.join(', ')}` });
        }

        const lat = latitude ? Number(latitude) : null;
        const lng = longitude ? Number(longitude) : null;
        if ((lat !== null && (lat < -90 || lat > 90)) || (lng !== null && (lng < -180 || lng > 180))) {
            return res.status(400).json({ success: false, message: 'Invalid GPS coordinates' });
        }

        const doc = await prisma.document.create({
            data: {
                name: name || req.file.originalname || 'Document',
                url,
                fileType: req.file.mimetype || null,
                fileSize: req.file.size || null,
                category: category || 'OTHER',
                description: description || null,
                latitude: lat,
                longitude: lng,
                takenAt: takenAt ? new Date(takenAt) : null,
                uploadedBy: req.user.id,
                projectId,
                tenantId: req.user.tenantId
            },
            include: {
                uploader: { select: { id: true, name: true, email: true } }
            }
        });

        await auditFromReq(req, {
            action: 'CREATE',
            entity: 'Document',
            entityId: doc.id,
            after: { name: doc.name, category: doc.category, projectId: doc.projectId, fileType: doc.fileType, fileSize: doc.fileSize }
        });

        res.status(201).json({
            success: true,
            data: {
                ...doc,
                latitude: doc.latitude == null ? null : Number(doc.latitude),
                longitude: doc.longitude == null ? null : Number(doc.longitude)
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete a document.
// @route   DELETE /api/documents/:id
// @access  Private (uploader / admin)
//
// Note: hard-delete. The audit log retains a snapshot. We don't soft-delete
// docs — removing a photo should remove it from the gallery immediately.
export const deleteDocument = async (req, res, next) => {
    try {
        const { id } = req.params;

        const doc = await prisma.document.findFirst({
            where: { id, tenantId: req.user.tenantId }
        });
        if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

        // Authorization: uploader, admin, or super-admin
        const isOwner = doc.uploadedBy === req.user.id;
        const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN';
        if (!isOwner && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Not authorized to delete this document' });
        }

        await prisma.document.delete({ where: { id } });

        await auditFromReq(req, {
            action: 'DELETE',
            entity: 'Document',
            entityId: doc.id,
            before: { name: doc.name, url: doc.url, category: doc.category, projectId: doc.projectId, uploadedBy: doc.uploadedBy }
        });

        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        next(error);
    }
};
