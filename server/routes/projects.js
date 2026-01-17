import express from 'express';
import { getProjects, getProject, createProject, updateProject, deleteProject } from '../controllers/projectController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
    .get(protect, getProjects)
    .post(protect, createProject);

router.route('/:id')
    .get(protect, getProject)
    .put(protect, updateProject)
    .delete(protect, deleteProject);

export default router;
