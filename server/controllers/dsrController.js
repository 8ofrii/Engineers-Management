import prisma from '../lib/prisma.js';
import { auditFromReq } from '../lib/audit.js';

const decimalOrNull = (v) => v == null || v === '' ? null : Number(v);

// Strip auto-managed fields from a DSR snapshot before audit logging.
const sanitize = (dsr) => dsr && ({
    id: dsr.id,
    projectId: dsr.projectId,
    reportDate: dsr.reportDate,
    status: dsr.status,
    weather: dsr.weather,
    hoursWorked: dsr.hoursWorked != null ? Number(dsr.hoursWorked) : null,
    progressNotes: dsr.progressNotes,
    issues: dsr.issues,
    photoIds: dsr.photoIds
});

// @desc    List DSRs (filterable). Engineers see their own, managers/admins see all.
// @route   GET /api/dsr?projectId=&status=&from=&to=
// @access  Private
export const listDsrs = async (req, res, next) => {
    try {
        const { projectId, status, from, to } = req.query;
        const where = { tenantId: req.user.tenantId };
        if (projectId) where.projectId = String(projectId);
        if (status) where.status = String(status);
        if (from || to) {
            where.reportDate = {};
            if (from) where.reportDate.gte = new Date(String(from));
            if (to) where.reportDate.lte = new Date(String(to));
        }
        if (req.user.role === 'ENGINEER') where.reportedBy = req.user.id;

        const reports = await prisma.dailySiteReport.findMany({
            where,
            include: {
                project: { select: { id: true, name: true } },
                reporter: { select: { id: true, name: true, email: true } },
                acknowledger: { select: { id: true, name: true } }
            },
            orderBy: [{ reportDate: 'desc' }, { createdAt: 'desc' }],
            take: 200
        });

        res.status(200).json({
            success: true,
            count: reports.length,
            data: reports.map(r => ({
                ...r,
                temperatureC: r.temperatureC != null ? Number(r.temperatureC) : null,
                hoursWorked: r.hoursWorked != null ? Number(r.hoursWorked) : null
            }))
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get a single DSR with full details.
// @route   GET /api/dsr/:id
// @access  Private
export const getDsr = async (req, res, next) => {
    try {
        const dsr = await prisma.dailySiteReport.findFirst({
            where: { id: req.params.id, tenantId: req.user.tenantId },
            include: {
                project: { select: { id: true, name: true } },
                reporter: { select: { id: true, name: true, email: true, role: true } },
                acknowledger: { select: { id: true, name: true, email: true, role: true } }
            }
        });
        if (!dsr) return res.status(404).json({ success: false, message: 'DSR not found' });

        // Engineer scoping — they only see their own.
        if (req.user.role === 'ENGINEER' && dsr.reportedBy !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        // Resolve photoIds → full document records (lazy join — small N)
        let photos = [];
        if (Array.isArray(dsr.photoIds) && dsr.photoIds.length > 0) {
            photos = await prisma.document.findMany({
                where: { id: { in: dsr.photoIds }, tenantId: req.user.tenantId }
            });
        }

        res.status(200).json({
            success: true,
            data: {
                ...dsr,
                temperatureC: dsr.temperatureC != null ? Number(dsr.temperatureC) : null,
                hoursWorked: dsr.hoursWorked != null ? Number(dsr.hoursWorked) : null,
                photos
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Create a new DSR (DRAFT). Engineers create their own; managers/admins
//          can create on behalf of any engineer (rare — usually for retro logging).
// @route   POST /api/dsr
// @access  Private
export const createDsr = async (req, res, next) => {
    try {
        const {
            projectId, reportDate, weather, temperatureC, hoursWorked,
            progressNotes, issues, visitorsNotes,
            workmenAttendance, materialsReceived, photoIds
        } = req.body;

        // Confirm project belongs to caller's tenant
        const project = await prisma.project.findFirst({
            where: { id: projectId, tenantId: req.user.tenantId, deletedAt: null }
        });
        if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

        // Engineer scope: must be assigned to this project
        if (req.user.role === 'ENGINEER' && project.engineerId !== req.user.id) {
            return res.status(403).json({ success: false, message: 'You are not assigned to this project' });
        }

        // Enforce one DSR per project per day. If one already exists for this date,
        // return 409 with the existing id so the client can edit instead.
        const date = new Date(reportDate);
        date.setUTCHours(0, 0, 0, 0);
        const existing = await prisma.dailySiteReport.findFirst({
            where: { projectId, reportDate: date, tenantId: req.user.tenantId }
        });
        if (existing) {
            return res.status(409).json({
                success: false,
                message: 'A report already exists for this project on this date',
                existingId: existing.id
            });
        }

        const dsr = await prisma.dailySiteReport.create({
            data: {
                projectId,
                reportDate: date,
                reportedBy: req.user.id,
                weather: weather || null,
                temperatureC: decimalOrNull(temperatureC),
                hoursWorked: decimalOrNull(hoursWorked),
                progressNotes: progressNotes || null,
                issues: issues || null,
                visitorsNotes: visitorsNotes || null,
                workmenAttendance: workmenAttendance || null,
                materialsReceived: materialsReceived || null,
                photoIds: photoIds || [],
                status: 'DRAFT',
                tenantId: req.user.tenantId
            }
        });

        await auditFromReq(req, {
            action: 'CREATE',
            entity: 'DailySiteReport',
            entityId: dsr.id,
            after: sanitize(dsr)
        });

        res.status(201).json({ success: true, data: dsr });
    } catch (error) {
        next(error);
    }
};

// @desc    Update an existing DSR. Only DRAFT can be edited; SUBMITTED requires
//          un-submit (manager rejects) before editing again. ACKNOWLEDGED is locked.
// @route   PUT /api/dsr/:id
// @access  Private (creator + admin/manager)
export const updateDsr = async (req, res, next) => {
    try {
        const before = await prisma.dailySiteReport.findFirst({
            where: { id: req.params.id, tenantId: req.user.tenantId }
        });
        if (!before) return res.status(404).json({ success: false, message: 'DSR not found' });

        if (before.status === 'ACKNOWLEDGED') {
            return res.status(400).json({ success: false, message: 'Acknowledged reports cannot be edited' });
        }

        const isAuthor = before.reportedBy === req.user.id;
        const isManager = req.user.role === 'PROJECT_MANAGER' || req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN';
        if (!isAuthor && !isManager) {
            return res.status(403).json({ success: false, message: 'Not authorized to edit this DSR' });
        }

        const data = {};
        const fields = ['weather', 'progressNotes', 'issues', 'visitorsNotes',
                        'workmenAttendance', 'materialsReceived', 'photoIds'];
        for (const f of fields) {
            if (req.body[f] !== undefined) data[f] = req.body[f];
        }
        if (req.body.temperatureC !== undefined) data.temperatureC = decimalOrNull(req.body.temperatureC);
        if (req.body.hoursWorked !== undefined) data.hoursWorked = decimalOrNull(req.body.hoursWorked);

        const updated = await prisma.dailySiteReport.update({
            where: { id: req.params.id },
            data
        });

        await auditFromReq(req, {
            action: 'UPDATE',
            entity: 'DailySiteReport',
            entityId: updated.id,
            before: sanitize(before),
            after: sanitize(updated)
        });

        res.status(200).json({ success: true, data: updated });
    } catch (error) {
        next(error);
    }
};

// @desc    Submit a DSR for manager acknowledgement (DRAFT → SUBMITTED).
// @route   PUT /api/dsr/:id/submit
// @access  Private (creator)
export const submitDsr = async (req, res, next) => {
    try {
        const dsr = await prisma.dailySiteReport.findFirst({
            where: { id: req.params.id, tenantId: req.user.tenantId }
        });
        if (!dsr) return res.status(404).json({ success: false, message: 'DSR not found' });
        if (dsr.reportedBy !== req.user.id && req.user.role === 'ENGINEER') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }
        if (dsr.status !== 'DRAFT') {
            return res.status(400).json({ success: false, message: `DSR is ${dsr.status}, cannot submit` });
        }

        const updated = await prisma.dailySiteReport.update({
            where: { id: dsr.id },
            data: { status: 'SUBMITTED', submittedAt: new Date() }
        });

        await auditFromReq(req, {
            action: 'SUBMIT',
            entity: 'DailySiteReport',
            entityId: dsr.id,
            metadata: { projectId: dsr.projectId, reportDate: dsr.reportDate }
        });

        // Notify project's manager(s) — best-effort; admins can also see submitted DSRs.
        await prisma.notification.create({
            data: {
                userId: dsr.reportedBy,  // self-confirm
                tenantId: req.user.tenantId,
                type: 'INFO',
                title: 'DSR submitted',
                message: 'Your daily site report has been submitted for review.',
                resourceId: dsr.id,
                resourceType: 'dsr'
            }
        }).catch(() => {});

        res.status(200).json({ success: true, data: updated });
    } catch (error) {
        next(error);
    }
};

// @desc    Acknowledge a submitted DSR (SUBMITTED → ACKNOWLEDGED). Manager/admin only.
// @route   PUT /api/dsr/:id/acknowledge
// @access  Private (PROJECT_MANAGER, ADMIN, SUPER_ADMIN)
export const acknowledgeDsr = async (req, res, next) => {
    try {
        if (!['PROJECT_MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Only managers / admins can acknowledge a DSR' });
        }

        const dsr = await prisma.dailySiteReport.findFirst({
            where: { id: req.params.id, tenantId: req.user.tenantId }
        });
        if (!dsr) return res.status(404).json({ success: false, message: 'DSR not found' });
        if (dsr.status !== 'SUBMITTED') {
            return res.status(400).json({ success: false, message: `DSR is ${dsr.status}, expected SUBMITTED` });
        }

        const updated = await prisma.dailySiteReport.update({
            where: { id: dsr.id },
            data: {
                status: 'ACKNOWLEDGED',
                acknowledgedBy: req.user.id,
                acknowledgedAt: new Date(),
                acknowledgeNotes: req.body?.acknowledgeNotes || null
            }
        });

        await auditFromReq(req, {
            action: 'ACKNOWLEDGE',
            entity: 'DailySiteReport',
            entityId: dsr.id,
            metadata: { projectId: dsr.projectId, reportDate: dsr.reportDate, notes: req.body?.acknowledgeNotes || null }
        });

        // Notify the engineer
        await prisma.notification.create({
            data: {
                userId: dsr.reportedBy,
                tenantId: req.user.tenantId,
                type: 'SUCCESS',
                title: 'DSR acknowledged',
                message: 'Your daily site report has been reviewed and acknowledged by management.',
                resourceId: dsr.id,
                resourceType: 'dsr'
            }
        }).catch(() => {});

        res.status(200).json({ success: true, data: updated });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete a DSR (only DRAFT can be deleted; submitted/acknowledged are
//          part of the audit trail).
// @route   DELETE /api/dsr/:id
// @access  Private (author + admin)
export const deleteDsr = async (req, res, next) => {
    try {
        const dsr = await prisma.dailySiteReport.findFirst({
            where: { id: req.params.id, tenantId: req.user.tenantId }
        });
        if (!dsr) return res.status(404).json({ success: false, message: 'DSR not found' });

        const isAuthor = dsr.reportedBy === req.user.id;
        const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN';
        if (!isAuthor && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }
        if (dsr.status !== 'DRAFT' && !isAdmin) {
            return res.status(400).json({ success: false, message: 'Only DRAFT reports can be deleted by the author. Submitted/acknowledged DSRs can only be removed by an admin.' });
        }

        await prisma.dailySiteReport.delete({ where: { id: dsr.id } });

        await auditFromReq(req, {
            action: 'DELETE',
            entity: 'DailySiteReport',
            entityId: dsr.id,
            before: sanitize(dsr)
        });

        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        next(error);
    }
};
