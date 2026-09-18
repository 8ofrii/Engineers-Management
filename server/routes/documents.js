import express from 'express';
import { protect } from '../middleware/auth.js';
import { documentUpload } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';
import { z } from 'zod';
import { listDocuments, uploadDocument, deleteDocument } from '../controllers/documentController.js';

// Two routers because the resources are mounted at two different prefixes:
//   /api/project-documents/:projectId  → list & upload
//   /api/documents/:id                 → delete
// Mounting these on a bare /api prefix used to capture /api/health.

const projectDocsRouter = express.Router();
projectDocsRouter.use(protect);

const docsRouter = express.Router();
docsRouter.use(protect);

const projectIdParam = z.object({
    projectId: z.string().uuid('Invalid project id')
});

const idParam = z.object({
    id: z.string().uuid('Invalid id')
});

// List + upload — :projectId is the only param
projectDocsRouter.get('/:projectId', validate({ params: projectIdParam }), listDocuments);
projectDocsRouter.post(
    '/:projectId',
    documentUpload.single('file'),
    validate({ params: projectIdParam }),
    uploadDocument
);

// Delete a single document
docsRouter.delete('/:id', validate({ params: idParam }), deleteDocument);

export { projectDocsRouter, docsRouter };
