import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { projectsAPI } from '../services/api';
import { FolderKanban, Plus, Pencil, Trash2 } from 'lucide-react';
import Layout from '../components/Layout';
import AddProjectModal from '../components/AddProjectModal';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';

export default function Projects() {
    const { t } = useTranslation();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProject, setEditingProject] = useState(null);

    // Delete state
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [projectToDelete, setProjectToDelete] = useState(null);

    useEffect(() => {
        loadProjects();
    }, []);

    const loadProjects = async () => {
        try {
            const response = await projectsAPI.getAll();
            setProjects(response.data.data);
        } catch (error) {
            console.error('Failed to load projects:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            'planning': 'warning',
            'in-progress': 'primary',
            'on-hold': 'warning',
            'completed': 'success',
            'cancelled': 'danger'
        };
        return colors[status] || 'primary';
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    const handleSaveProject = async (projectData) => {
        try {
            if (editingProject) {
                await projectsAPI.update(editingProject.id, projectData);
            } else {
                await projectsAPI.create(projectData);
            }
            loadProjects(); // Reload the list
        } catch (error) {
            console.error('Failed to save project:', error);
            alert('Failed to save project. Please try again.');
        }
    };

    const handleDeleteClick = (project) => {
        setProjectToDelete(project);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!projectToDelete) return;
        try {
            await projectsAPI.delete(projectToDelete.id);
            loadProjects();
        } catch (error) {
            console.error('Failed to delete project:', error);
            alert('Failed to delete project. Please try again.');
        } finally {
            setProjectToDelete(null);
        }
    };

    const openCreateModal = () => {
        setEditingProject(null);
        setIsModalOpen(true);
    };

    const openEditModal = (project) => {
        setEditingProject(project);
        setIsModalOpen(true);
    };

    if (loading) {
        return (
            <Layout>
                <div className="flex-center" style={{ minHeight: '60vh' }}>
                    <div className="spinner"></div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div>
                <div className="flex-between mb-xl">
                    <div>
                        <h1 className="flex gap-md">
                            <FolderKanban size={32} />
                            {t('projects.title')}
                        </h1>
                        <p className="text-secondary">{t('projects.subtitle')}</p>
                    </div>
                    <button className="btn btn-primary" onClick={openCreateModal}>
                        <Plus size={20} />
                        {t('projects.newProject')}
                    </button>
                </div>

                {projects.length === 0 ? (
                    <div className="card text-center" style={{ padding: 'var(--spacing-2xl)' }}>
                        <FolderKanban size={64} style={{ margin: '0 auto var(--spacing-lg)', color: 'var(--text-tertiary)' }} />
                        <h3>{t('projects.noProjects')}</h3>
                        <p className="text-secondary">{t('projects.createFirst')}</p>
                        <button className="btn btn-primary mt-lg" onClick={openCreateModal}>
                            <Plus size={20} />
                            {t('projects.newProject')}
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-2">
                        {projects.map((project) => (
                            <div key={project.id} className="card">
                                <div className="flex-between mb-md">
                                    <h3>{project.name}</h3>
                                    <div className="flex gap-sm">
                                        <span className={`badge badge-${getStatusColor(project.status)}`}>
                                            {t(`projects.status.${project.status}`)}
                                        </span>
                                        <button
                                            className="btn btn-secondary btn-sm"
                                            style={{ padding: '4px 8px' }}
                                            onClick={() => openEditModal(project)}
                                            title={t('common.edit')}
                                        >
                                            <Pencil size={14} />
                                        </button>
                                        <button
                                            className="btn btn-secondary btn-sm"
                                            style={{ padding: '4px 8px', color: '#ef4444', borderColor: '#ef4444' }}
                                            onClick={() => handleDeleteClick(project)}
                                            title={t('common.delete')}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                                <p className="text-secondary mb-md">{project.description || t('common.noData')}</p>
                                <div className="flex-between">
                                    <div>
                                        <div className="text-secondary" style={{ fontSize: 'var(--font-size-sm)' }}>
                                            {t('projects.budget')}
                                        </div>
                                        <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600 }}>
                                            {formatCurrency(project.budget)}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-secondary" style={{ fontSize: 'var(--font-size-sm)' }}>
                                            {t('projects.spent')}
                                        </div>
                                        <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600 }}>
                                            {formatCurrency(project.actualCost)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <AddProjectModal
                isOpen={isModalOpen}
                initialData={editingProject}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleSaveProject}
            />

            <DeleteConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                itemName={projectToDelete?.name}
                title={t('common.deleteConfirmTitle')}
                message={t('common.deleteConfirmMessage')}
            />
        </Layout>
    );
}
