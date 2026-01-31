import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { projectsAPI } from '../services/api';
import { FolderKanban, Plus, Pencil, Trash2 } from 'lucide-react';
import { useAlert } from '../context/AlertContext';
import Layout from '../components/Layout';
import AddProjectModal from '../components/AddProjectModal';

export default function Projects() {
    const { t } = useTranslation();
    const { showAlert } = useAlert();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProject, setEditingProject] = useState(null);

    // Delete state managed via Alert now, but keeping local var for reference if needed
    // However, the CustomAlert handles the confirmation internally via callbacks.

    useEffect(() => {
        loadProjects();
    }, []);

    const loadProjects = async () => {
        try {
            const response = await projectsAPI.getAll();
            setProjects(response.data.data);
        } catch (error) {
            console.error('Failed to load projects:', error);
            // Optional: Show alert on load failure or just log it
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
        return new Intl.NumberFormat('en-EG', {
            style: 'currency',
            currency: 'EGP'
        }).format(amount);
    };

    const handleSaveProject = async (projectData) => {
        try {
            if (editingProject) {
                await projectsAPI.update(editingProject.id, projectData);
                showAlert({
                    type: 'success',
                    title: t('common.success'),
                    message: 'Project updated successfully'
                });
            } else {
                await projectsAPI.create(projectData);
                showAlert({
                    type: 'success',
                    title: t('common.success'),
                    message: 'Project created successfully'
                });
            }
            loadProjects();
        } catch (error) {
            console.error('Failed to save project:', error);
            const errorMsg = error.response?.data?.message || error.message || 'Unknown error occurred';
            showAlert({
                type: 'error',
                title: t('common.error'),
                message: `Failed to save project: ${errorMsg}`
            });
        }
    };

    const handleDeleteClick = (project) => {
        showAlert({
            type: 'warning',
            title: t('common.deleteConfirmTitle'),
            message: `${t('common.deleteConfirmMessage')} "${project.name}"?`,
            showCancel: true,
            confirmText: t('common.delete'),
            onConfirm: async () => {
                try {
                    await projectsAPI.delete(project.id);
                    showAlert({ type: 'success', title: 'Deleted', message: 'Project deleted successfully' });
                    loadProjects();
                } catch (error) {
                    console.error('Failed to delete project:', error);
                    showAlert({ type: 'error', title: 'Error', message: 'Failed to delete project' });
                }
            }
        });
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
                            <div key={project.id} className="card" style={{
                                padding: 'var(--spacing-lg)',
                                background: 'var(--bg-secondary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-lg)'
                            }}>
                                <div className="flex-between mb-md">
                                    <h3>{project.name}</h3>
                                    <div className="flex gap-sm">
                                        <span className={`badge badge-${getStatusColor(project.status.toLowerCase())}`}>
                                            {t(`projects.status.${project.status.toLowerCase()}`)}
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
                                    <div>
                                        <div className="text-secondary" style={{ fontSize: 'var(--font-size-sm)' }}>
                                            {t('projects.remaining')}
                                        </div>
                                        <div style={{
                                            fontSize: 'var(--font-size-lg)',
                                            fontWeight: 600,
                                            color: (project.budget - project.actualCost) < 0 ? 'var(--color-danger)' : 'var(--color-success)'
                                        }}>
                                            {formatCurrency(project.budget - project.actualCost)}
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
        </Layout>
    );
}
