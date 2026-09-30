import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { projectsAPI, documentsAPI } from '../services/api';
import { FolderKanban, Plus, Pencil, Trash2, Receipt, X, AlertTriangle, FileText } from 'lucide-react';
import { useAlert } from '../context/AlertContext';
import Layout from '../components/Layout';
import AddProjectModal from '../components/AddProjectModal';
import { useFormat, getLocalizedName, getLocalizedSubName } from '../utils/format';

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
            const targetName = getLocalizedName(deleteProjectTarget, isArabic);
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
                    <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 350px), 1fr))', gap: 'var(--spacing-lg)' }}>
                        {displayedProjects.map((project) => {
                            const displayBudget = Number(project.totalContractValue || project.budget || 0);
                            const totalPaid = Number(project.totalPaid ?? 0);
                            const totalExpenses = Number(project.actualCost || 0) + Number(project.officeRevenue || 0);
                            const remaining = displayBudget - totalExpenses;
                            const budgetPct = displayBudget > 0
                                ? Math.round((totalExpenses / displayBudget) * 100)
                                : 0;
                            const budgetBarColor = budgetPct >= 90 ? '#ef4444' : budgetPct >= 70 ? '#f59e0b' : '#10b981';
                            const completionPct = project.status?.toUpperCase() === 'COMPLETED'
                                ? 100
                                : Math.min(100, Math.max(0, Number(project.completionPercent || 0)));
                            return (
                            <div key={project.id} className="card proj-card" style={{
                                display: 'flex',
                                flexDirection: 'column',
                                height: '100%',
                                padding: 'var(--spacing-lg)',
                                border: project.projectSafeBalance < 0 ? '2px solid #ef4444' : '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-lg)',
                                boxShadow: project.projectSafeBalance < 0 ? '0 0 15px rgba(239, 68, 68, 0.2)' : 'none'
                            }}>
                                {/* Top Header Row: Project Name & Top Action Controls */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    justifyContent: 'space-between',
                                    gap: '12px',
                                    marginBottom: '10px'
                                }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <h3 style={{
                                            margin: 0,
                                            fontSize: '1.25rem',
                                            fontWeight: 700,
                                            lineHeight: 1.3,
                                            color: 'var(--text-primary)',
                                            wordBreak: 'break-word'
                                        }}>
                                            {getLocalizedName(project, isArabic)}
                                        </h3>
                                        {getLocalizedSubName(project, isArabic) && (
                                            <div style={{
                                                fontSize: '0.82rem',
                                                color: 'var(--text-tertiary)',
                                                marginTop: '2px',
                                                wordBreak: 'break-word'
                                            }}>
                                                {getLocalizedSubName(project, isArabic)}
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                        {/* Completion % ring */}
                                        <div title={`${completionPct}% ${isArabic ? 'مكتمل' : (t('projects.complete', 'complete'))}`} style={{ position: 'relative', width: 38, height: 38, flexShrink: 0 }}>
                                            <svg width="38" height="38" style={{ transform: 'rotate(-90deg)' }}>
                                                <circle cx="19" cy="19" r="15" fill="none" stroke="var(--bg-tertiary)" strokeWidth="3.5" />
                                                <circle cx="19" cy="19" r="15" fill="none"
                                                    stroke={completionPct >= 100 ? '#10b981' : completionPct >= 50 ? 'var(--color-primary-light)' : '#f59e0b'}
                                                    strokeWidth="3.5"
                                                    strokeDasharray={`${(completionPct / 100) * 94.2} 94.2`}
                                                    strokeLinecap="round"
                                                />
                                            </svg>
                                            <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                                {completionPct}%
                                            </span>
                                        </div>
                                        <span className={`badge badge-${getStatusColor(project.status.toLowerCase())}`} style={{ whiteSpace: 'nowrap' }}>
                                            {t(`projects.status.${project.status.toLowerCase()}`)}
                                        </span>
                                        <button
                                            className="icon-btn"
                                            onClick={() => openEditModal(project)}
                                            title={t('common.edit')}
                                            style={{ width: 28, height: 28, padding: 0 }}
                                        >
                                            <Pencil size={13} />
                                        </button>
                                        <button
                                            className="icon-btn danger"
                                            onClick={() => handleDeleteClick(project)}
                                            title={t('common.delete')}
                                            style={{ width: 28, height: 28, padding: 0 }}
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                </div>

                                {/* Negative Safe Balance Alert Banner */}
                                {project.projectSafeBalance < 0 && (
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        background: 'rgba(239, 68, 68, 0.12)',
                                        border: '1px solid rgba(239, 68, 68, 0.3)',
                                        borderRadius: '8px',
                                        padding: '5px 10px',
                                        marginBottom: '10px',
                                        color: '#f87171',
                                        fontSize: '0.75rem',
                                        fontWeight: 600
                                    }}>
                                        <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                                        <span>{t('projects.negativeBalanceAlert') || (isArabic ? 'عجز في خزينة المشروع' : 'Negative Safe Balance')}</span>
                                    </div>
                                )}

                                {/* Description with uniform clamp */}
                                <p className="text-secondary" style={{
                                    margin: '0 0 var(--spacing-md) 0',
                                    fontSize: '0.85rem',
                                    minHeight: '2.4em',
                                    lineHeight: 1.4,
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden'
                                }}>
                                    {project.description || (
                                        <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                                            {t('common.noData')}
                                        </span>
                                    )}
                                </p>

                                {/* Middle 3 Stats Grid */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                                    gap: '8px',
                                    marginBottom: 'var(--spacing-md)'
                                }}>
                                    <div className="stat-cell" style={{ padding: '8px 8px', textAlign: 'center' }}>
                                        <label style={{ fontSize: '0.7rem', marginBottom: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={isArabic ? 'إجمالي المدفوع' : (t('projects.totalPaid') || 'Total Paid')}>
                                            {isArabic ? 'إجمالي المدفوع' : (t('projects.totalPaid') || 'Total Paid')}
                                        </label>
                                        <b className="pos" style={{ fontSize: '0.92rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }} title={formatCurrency(totalPaid)}>
                                            {formatCurrency(totalPaid)}
                                        </b>
                                    </div>
                                    <div className="stat-cell" style={{ padding: '8px 8px', textAlign: 'center' }}>
                                        <label style={{ fontSize: '0.7rem', marginBottom: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={t('projects.officeProfit') || 'أرباح المكتب'}>
                                            {t('projects.officeProfit') || 'أرباح المكتب'}
                                        </label>
                                        <b className="acc" style={{ fontSize: '0.92rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }} title={formatCurrency(project.officeRevenue)}>
                                            {formatCurrency(project.officeRevenue)}
                                        </b>
                                    </div>
                                    <div className="stat-cell" style={{ padding: '8px 8px', textAlign: 'center' }}>
                                        <label style={{ fontSize: '0.7rem', marginBottom: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={t('projects.safeBalance') || 'خزينة المشروع'}>
                                            {t('projects.safeBalance') || 'خزينة المشروع'}
                                        </label>
                                        <b className={project.projectSafeBalance < 0 ? 'neg' : 'pos'} style={{ fontSize: '0.92rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }} title={formatCurrency(project.projectSafeBalance)}>
                                            {formatCurrency(project.projectSafeBalance)}
                                        </b>
                                    </div>
                                </div>

                                {/* Budget progress bar */}
                                <div style={{ marginBottom: 'var(--spacing-md)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 5 }}>
                                        <span>{isArabic ? 'المستخدم من الميزانية' : t('projects.budgetUsed', 'Budget Used')}: <strong>{budgetPct}%</strong></span>
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

                                {/* Budget / Spent / Remaining Summary Box */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                                    gap: '8px',
                                    padding: '8px 10px',
                                    background: 'var(--bg-tertiary)',
                                    borderRadius: '10px',
                                    border: '1px solid var(--border-color)',
                                    marginBottom: 'var(--spacing-md)'
                                }}>
                                    <div style={{ minWidth: 0, textAlign: isArabic ? 'right' : 'left' }}>
                                        <div className="text-secondary" style={{ fontSize: '0.7rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {t('projects.budget')}
                                        </div>
                                        <div style={{ fontSize: '0.88rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={formatCurrency(displayBudget)}>
                                            {formatCurrency(displayBudget)}
                                        </div>
                                    </div>
                                    <div style={{ minWidth: 0, textAlign: 'center' }}>
                                        <div className="text-secondary" style={{ fontSize: '0.7rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {t('projects.spent')}
                                        </div>
                                        <div style={{ fontSize: '0.88rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={formatCurrency(project.actualCost)}>
                                            {formatCurrency(project.actualCost)}
                                        </div>
                                    </div>
                                    <div style={{ minWidth: 0, textAlign: isArabic ? 'left' : 'right' }}>
                                        <div className="text-secondary" style={{ fontSize: '0.7rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {t('projects.remaining')}
                                        </div>
                                        <div
                                            title={isArabic ? 'المتبقي = إجمالي الميزانية - إجمالي المصروفات' : 'Remaining = Total Budget - Total Expenses'}
                                            style={{
                                                fontSize: '0.88rem',
                                                fontWeight: 600,
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                color: remaining < 0 ? 'var(--color-danger)' : 'var(--color-success)'
                                            }}
                                        >
                                            {formatCurrency(remaining)}
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons: Documents & Transactions (Pinned to Bottom) */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: '10px',
                                    marginTop: 'auto',
                                    paddingTop: 'var(--spacing-xs)'
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
                                        onClick={() => viewProjectTransactions(project.id, getLocalizedName(project, isArabic))}
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
            {deleteProjectTarget && createPortal(
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
                                {t('common.deleteConfirmMessage', 'هل أنت متأكد من رغبتك في حذف')} <strong style={{ color: 'var(--text-primary)' }}>"{getLocalizedName(deleteProjectTarget, isArabic)}"</strong>؟
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
                </div>,
                document.body
            )}
        </Layout >
    );
}
