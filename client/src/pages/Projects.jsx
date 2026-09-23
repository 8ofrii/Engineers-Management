import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { projectsAPI, documentsAPI } from '../services/api';
import { FolderKanban, Plus, Pencil, Trash2, Receipt, X, AlertTriangle, FileText } from 'lucide-react';
import { useAlert } from '../context/AlertContext';
import Layout from '../components/Layout';
import AddProjectModal from '../components/AddProjectModal';
import { useFormat } from '../utils/format';

export default function Projects() {
    const { t, i18n } = useTranslation();
    const isArabic = (i18n.language || '').startsWith('ar');
    const { showAlert } = useAlert();
    const navigate = useNavigate();
    const { projectId: urlProjectId } = useParams();
    const [searchParams] = useSearchParams();
    const filterProjectId = urlProjectId || searchParams.get('projectId') || searchParams.get('id');

    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProject, setEditingProject] = useState(null);

    // Delete project with optional transaction cascade deletion
    const [deleteProjectTarget, setDeleteProjectTarget] = useState(null);
    const [deleteRelatedTransactions, setDeleteRelatedTransactions] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);

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

    const displayedProjects = filterProjectId
        ? projects.filter(p => p.id === filterProjectId)
        : projects;

    const viewProjectTransactions = (projectId, projectName) => {
        navigate(`/finance?projectId=${projectId}&projectName=${encodeURIComponent(projectName)}`);
    };

    const getStatusColor = (status) => {
        const colors = {
            'planning': 'warning',
            'in-progress': 'primary',
            'in_progress': 'primary',
            'on-hold': 'warning',
            'on_hold': 'warning',
            'completed': 'success',
            'cancelled': 'danger'
        };
        return colors[status] || 'primary';
    };

    const { currency: formatCurrency } = useFormat();

    const handleSaveProject = async (projectData, contractData = null) => {
        try {
            let targetProjectId = null;
            if (editingProject) {
                await projectsAPI.update(editingProject.id, projectData);
                targetProjectId = editingProject.id;
                showAlert({
                    type: 'success',
                    title: t('common.success'),
                    message: isArabic ? 'تم تحديث المشروع بنجاح' : 'Project updated successfully'
                });
            } else {
                const res = await projectsAPI.create(projectData);
                targetProjectId = res.data?.data?.id;
                showAlert({
                    type: 'success',
                    title: t('common.success'),
                    message: isArabic ? 'تم إنشاء المشروع بنجاح' : 'Project created successfully'
                });
            }

            // If a contract or legal document was attached, upload it
            if (targetProjectId && contractData?.file) {
                try {
                    const docForm = new FormData();
                    docForm.append('file', contractData.file);
                    docForm.append('name', contractData.name || contractData.file.name);
                    docForm.append('category', contractData.category || 'CONTRACT');
                    if (contractData.description) {
                        docForm.append('description', contractData.description);
                    }
                    await documentsAPI.upload(targetProjectId, docForm);
                } catch (docErr) {
                    console.error('Failed to upload contract document:', docErr);
                    showAlert({
                        type: 'warning',
                        title: isArabic ? 'تنبيه في رفع العقد' : 'Contract Upload Notice',
                        message: isArabic
                            ? 'تم إنشاء المشروع بنجاح، لكن تعذر رفع ملف العقد. يمكنك إضافته من صفحة وثائق المشروع.'
                            : 'Project was created successfully, but uploading the contract file failed. You can add it from Project Documents.'
                    });
                }
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
        setDeleteProjectTarget(project);
        setDeleteRelatedTransactions(true);
    };

    const confirmDeleteProject = async () => {
        if (!deleteProjectTarget) return;
        setIsDeleting(true);
        try {
            const res = await projectsAPI.delete(deleteProjectTarget.id, {
                deleteTransactions: deleteRelatedTransactions
            });
            const deletedTxCount = res.data?.data?.deletedTransactionsCount || 0;
            const targetName = deleteProjectTarget.name;
            setDeleteProjectTarget(null);
            showAlert({
                type: 'success',
                title: t('common.success', 'نجاح'),
                message: deleteRelatedTransactions && deletedTxCount > 0
                    ? (isArabic ? `تم حذف المشروع "${targetName}" وحذف ${deletedTxCount} معاملة ومصروف مرتبطة به بنجاح.` : `Project "${targetName}" and ${deletedTxCount} related transactions deleted successfully.`)
                    : (isArabic ? `تم حذف المشروع "${targetName}" بنجاح.` : `Project "${targetName}" deleted successfully.`)
            });
            loadProjects();
        } catch (error) {
            console.error('Failed to delete project:', error);
            const errorMsg = error.response?.data?.message || (isArabic ? 'فشل حذف المشروع' : 'Failed to delete project');
            showAlert({
                type: 'error',
                title: t('common.error', 'خطأ'),
                message: errorMsg
            });
        } finally {
            setIsDeleting(false);
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
                        <div className="app-eyebrow">{isArabic ? 'مساحة العمل' : 'Workspace'}</div>
                        <h1 className="app-title" style={{ fontSize: '1.9rem' }}>
                            <FolderKanban size={28} />
                            {t('projects.title')}
                        </h1>
                        <p className="app-sub">{t('projects.subtitle')}</p>
                    </div>
                    <button className="btn btn-primary" onClick={openCreateModal}>
                        <Plus size={20} />
                        {t('projects.newProject')}
                    </button>
                </div>

                {filterProjectId && (
                    <div className="card mb-lg" style={{
                        background: 'rgba(255, 90, 31, 0.08)',
                        border: '1px solid rgba(255, 90, 31, 0.3)',
                        padding: '12px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderRadius: 'var(--radius-md)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <FolderKanban size={20} style={{ color: 'var(--color-primary-light)' }} />
                            <span style={{ fontWeight: 700 }}>
                                {isArabic ? 'عرض تفاصيل المشروع المحدد' : 'Showing selected project details'}
                            </span>
                        </div>
                        <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => navigate('/projects')}
                            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                        >
                            <X size={14} />
                            <span>{isArabic ? 'عرض جميع المشاريع' : 'Show All Projects'}</span>
                        </button>
                    </div>
                )}

                {displayedProjects.length === 0 ? (
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
                        {displayedProjects.map((project) => {
                            const displayBudget = Number(project.totalContractValue || project.budget || 0);
                            const totalPaid = Number(project.totalPaid ?? 0);
                            const totalExpenses = Number(project.actualCost || 0) + Number(project.officeRevenue || 0);
                            const remaining = project.projectSafeBalance !== undefined && project.projectSafeBalance !== null
                                ? Number(project.projectSafeBalance)
                                : (totalPaid - totalExpenses);
                            const budgetPct = displayBudget > 0
                                ? Math.round((totalExpenses / displayBudget) * 100)
                                : 0;
                            const budgetBarColor = budgetPct >= 90 ? '#ef4444' : budgetPct >= 70 ? '#f59e0b' : '#10b981';
                            const completionPct = project.status?.toUpperCase() === 'COMPLETED'
                                ? 100
                                : Math.min(100, Math.max(0, Number(project.completionPercent || 0)));
                            return (
                            <div key={project.id} className="card proj-card" style={{
                                padding: 'var(--spacing-lg)',
                                border: project.projectSafeBalance < 0 ? '2px solid #ef4444' : '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-lg)',
                                boxShadow: project.projectSafeBalance < 0 ? '0 0 15px rgba(239, 68, 68, 0.2)' : 'none'
                            }}>
                                <div className="flex-between mb-md">
                                    <div className="flex flex-col">
                                        <h3>{project.name}</h3>
                                        {project.projectSafeBalance < 0 && (
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#f87171', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                                <AlertTriangle size={13} />
                                                {t('projects.negativeBalanceAlert') || 'عجز في خزينة المشروع'}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex gap-sm" style={{ alignItems: 'center' }}>
                                        {/* Completion % ring */}
                                        <div title={`${completionPct}% ${isArabic ? 'مكتمل' : (t('projects.complete', 'complete'))}`} style={{ position: 'relative', width: 40, height: 40, flexShrink: 0 }}>
                                            <svg width="40" height="40" style={{ transform: 'rotate(-90deg)' }}>
                                                <circle cx="20" cy="20" r="16" fill="none" stroke="var(--bg-tertiary)" strokeWidth="4" />
                                                <circle cx="20" cy="20" r="16" fill="none"
                                                    stroke={completionPct >= 100 ? '#10b981' : completionPct >= 50 ? 'var(--color-primary-light)' : '#f59e0b'}
                                                    strokeWidth="4"
                                                    strokeDasharray={`${(completionPct / 100) * 100.5} 100.5`}
                                                    strokeLinecap="round"
                                                />
                                            </svg>
                                            <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                                {completionPct}%
                                            </span>
                                        </div>
                                        <span className={`badge badge-${getStatusColor(project.status.toLowerCase())}`}>
                                            {t(`projects.status.${project.status.toLowerCase()}`)}
                                        </span>
                                        <button
                                            className="icon-btn"
                                            onClick={() => openEditModal(project)}
                                            title={t('common.edit')}
                                        >
                                            <Pencil size={14} />
                                        </button>
                                        <button
                                            className="icon-btn danger"
                                            onClick={() => handleDeleteClick(project)}
                                            title={t('common.delete')}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                                <p className="text-secondary mb-md">{project.description || t('common.noData')}</p>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(3, 1fr)',
                                    gap: '10px',
                                    marginBottom: 'var(--spacing-md)'
                                }}>
                                    <div className="stat-cell">
                                        <label>
                                            {t('projects.totalPaid') || (isArabic ? 'إجمالي المدفوع' : 'Total Paid')}
                                        </label>
                                        <b className="pos">
                                            {formatCurrency(totalPaid)}
                                        </b>
                                    </div>
                                    <div className="stat-cell">
                                        <label>
                                            {t('projects.officeProfit') || 'أرباح المكتب'}
                                        </label>
                                        <b className="acc">
                                            {formatCurrency(project.officeRevenue)}
                                        </b>
                                    </div>
                                    <div className="stat-cell">
                                        <label>
                                            {t('projects.safeBalance') || 'خزينة المشروع'}
                                        </label>
                                        <b className={project.projectSafeBalance < 0 ? 'neg' : 'pos'}>
                                            {formatCurrency(project.projectSafeBalance)}
                                        </b>
                                    </div>
                                </div>

                                {/* Budget progress bar (#1) */}
                                <div style={{ marginBottom: 'var(--spacing-md)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
                                        <span>{isArabic ? 'المستخدم من الميزانية' : t('projects.budgetUsed', 'Budget Used')}: {budgetPct}%</span>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: budgetBarColor, fontWeight: 700 }}>
                                            <span className="dot" style={{ background: budgetBarColor }} />
                                            {budgetPct >= 90
                                                ? (t('projects.budgetCritical', 'Critical'))
                                                : budgetPct >= 70
                                                    ? (t('projects.budgetWarning', 'Warning'))
                                                    : (t('projects.budgetHealthy', 'Healthy'))}
                                        </span>
                                    </div>
                                    <div className="meter" style={{ '--w': `${Math.min(100, Math.max(0, budgetPct))}%` }}>
                                        <i style={{ width: `${Math.min(100, Math.max(0, budgetPct))}%`, background: budgetBarColor }} />
                                    </div>
                                </div>

                                <div className="flex-between">
                                    <div>
                                        <div className="text-secondary" style={{ fontSize: 'var(--font-size-sm)' }}>
                                            {t('projects.budget')}
                                        </div>
                                        <div style={{ fontSize: 'var(--font-size-md)', fontWeight: 600 }}>
                                            {formatCurrency(displayBudget)}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-secondary" style={{ fontSize: 'var(--font-size-sm)' }}>
                                            {t('projects.spent')}
                                        </div>
                                        <div style={{ fontSize: 'var(--font-size-md)', fontWeight: 600 }}>
                                            {formatCurrency(project.actualCost)}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-secondary" style={{ fontSize: 'var(--font-size-sm)' }}>
                                            {t('projects.remaining')}
                                        </div>
                                        <div
                                            title={isArabic ? 'المتبقي = إجمالي المدفوع - (المنصرف + أرباح المكتب)' : 'Remaining = Total Paid - (Spent + Office Profit)'}
                                            style={{
                                                fontSize: 'var(--font-size-md)',
                                                fontWeight: 600,
                                                color: remaining < 0 ? 'var(--color-danger)' : 'var(--color-success)'
                                            }}
                                        >
                                            {formatCurrency(remaining)}
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons: Documents & Transactions */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: '10px',
                                    marginTop: 'var(--spacing-md)'
                                }}>
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px',
                                            padding: '8px 12px',
                                            fontSize: '0.85rem'
                                        }}
                                        onClick={() => navigate(`/projects/${project.id}/documents`)}
                                        title={t('projects.viewDocuments') || 'Documents & Contracts'}
                                    >
                                        <FileText size={15} style={{ color: 'var(--color-primary-light)' }} />
                                        <span>{t('projects.viewDocuments') || 'Documents'}</span>
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px',
                                            padding: '8px 12px',
                                            fontSize: '0.85rem'
                                        }}
                                        onClick={() => viewProjectTransactions(project.id, project.name)}
                                    >
                                        <Receipt size={15} />
                                        <span>{t('projects.viewTransactions')}</span>
                                    </button>
                                </div>
                            </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <AddProjectModal
                isOpen={isModalOpen}
                initialData={editingProject}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleSaveProject}
            />

            {/* Delete Project Confirmation Modal with Related Transactions Option */}
            {deleteProjectTarget && (
                <div className="modal-overlay" onClick={() => !isDeleting && setDeleteProjectTarget(null)}>
                    <div 
                        className="modal-container" 
                        style={{ maxWidth: '480px', padding: '32px', position: 'relative' }} 
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button 
                            className="modal-close" 
                            onClick={() => setDeleteProjectTarget(null)} 
                            disabled={isDeleting}
                            style={{ position: 'absolute', [isArabic ? 'left' : 'right']: '24px', top: '24px' }}
                        >
                            <X size={24} />
                        </button>

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                            <div style={{ 
                                width: '64px', 
                                height: '64px', 
                                borderRadius: '50%', 
                                background: 'rgba(239, 68, 68, 0.12)', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                marginBottom: '20px'
                            }}>
                                <AlertTriangle size={32} color="var(--color-danger, #ef4444)" />
                            </div>

                            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '12px', color: 'var(--text-primary)' }}>
                                {t('common.deleteConfirmTitle', 'تأكيد الحذف')}
                            </h2>

                            <p style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.6' }}>
                                {t('common.deleteConfirmMessage', 'هل أنت متأكد من رغبتك في حذف')} <strong style={{ color: 'var(--text-primary)' }}>"{deleteProjectTarget.name}"</strong>؟
                            </p>

                            {/* Option to delete related transactions */}
                            <div style={{ 
                                width: '100%', 
                                background: 'var(--bg-secondary)', 
                                border: '1px solid var(--border-color)', 
                                borderRadius: 'var(--radius-md)', 
                                padding: '14px 16px', 
                                marginBottom: '24px',
                                textAlign: isArabic ? 'right' : 'left'
                            }}>
                                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={deleteRelatedTransactions}
                                        onChange={(e) => setDeleteRelatedTransactions(e.target.checked)}
                                        style={{ marginTop: '4px', cursor: 'pointer', width: '16px', height: '16px' }}
                                    />
                                    <div>
                                        <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', display: 'block' }}>
                                            {t('projects.deleteWithTransactions', 'حذف كافة المعاملات والمصاريف التابعة لهذا المشروع')}
                                        </span>
                                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>
                                            {deleteRelatedTransactions 
                                                ? t('projects.deleteWithTransactionsHint', 'سيتم مسح جميع المصاريف والقيود المسجلة على المشروع نهائياً لتفادي بقائها.')
                                                : t('projects.keepTransactionsHint', 'ستبقى المعاملات مسجلة كمعاملات عامة بدون مشروع.')
                                            }
                                        </span>
                                    </div>
                                </label>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                                <button 
                                    type="button" 
                                    className="btn btn-secondary" 
                                    onClick={() => setDeleteProjectTarget(null)}
                                    disabled={isDeleting}
                                    style={{ flex: 1, padding: '10px', fontSize: '15px', fontWeight: '600', justifyContent: 'center' }}
                                >
                                    {t('common.cancel', 'إلغاء')}
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-danger"
                                    disabled={isDeleting}
                                    onClick={confirmDeleteProject}
                                    style={{ 
                                        flex: 1, 
                                        padding: '10px', 
                                        fontSize: '15px',
                                        fontWeight: '600', 
                                        background: 'var(--color-danger, #ef4444)', 
                                        color: 'white', 
                                        border: 'none',
                                        justifyContent: 'center'
                                    }}
                                >
                                    {isDeleting ? (t('common.loading') || '...') : t('common.delete', 'حذف')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </Layout >
    );
}
