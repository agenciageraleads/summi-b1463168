import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminRoute } from '@/components/Admin/AdminRoute';
import { AdminLayout } from '@/components/Admin/AdminLayout';
import { useBlogAdmin } from '@/hooks/useBlogAdmin';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Eye, EyeOff, ExternalLink, Clock } from 'lucide-react';
import { SEO } from '@/components/SEO';
import { useTranslation } from 'react-i18next';

const categoryColors: Record<string, string> = {
  Produtividade: 'bg-green-100 text-green-700',
  Tutoriais: 'bg-blue-100 text-blue-700',
  Negócios: 'bg-teal-100 text-teal-700',
  Tecnologia: 'bg-orange-100 text-orange-700',
};

const AdminBlogPage = () => {
  const { t } = useTranslation();
  const { posts, isLoading, togglePublish, deletePost } = useBlogAdmin();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const handleToggle = async (id: string, current: boolean) => {
    setTogglingId(id);
    await togglePublish(id, !current);
    setTogglingId(null);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    await deletePost(deletingId);
    setDeletingId(null);
  };

  return (
    <AdminRoute>
      <AdminLayout>
        <SEO
          title={t('blog')}
          description={t('blog_admin_subtitle')}
          noIndex
        />
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{t('blog')}</h1>
              <p className="text-gray-500 mt-1">{t('blog_admin_subtitle')}</p>
            </div>
            <Link to="/admin/blog/new">
              <Button className="bg-green-600 hover:bg-green-700 text-white gap-2">
                <Plus className="w-4 h-4" />
                {t('new_post')}
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total', value: posts.length },
              { label: t('published'), value: posts.filter(p => p.published).length },
              { label: t('draft'), value: posts.filter(p => !p.published).length },
            ].map(stat => (
              <div key={stat.label} className="bg-white rounded-lg border border-gray-200 p-4 text-center">
                <h2 className="text-2xl font-bold text-gray-900">{stat.value}</h2>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Posts Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <h2 className="text-lg font-medium mb-2">Nenhum post encontrado</h2>
                <h3 className="text-sm">Crie o primeiro post clicando em "Novo Post".</h3>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Post</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Categoria</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Leitura</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {posts.map(post => (
                    <tr key={post.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900 leading-snug line-clamp-1">{post.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{post.published_at}</p>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <Badge className={`text-xs ${categoryColors[post.category] || 'bg-gray-100 text-gray-700'}`}>
                          {post.category}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 hidden lg:table-cell">
                        <span className="flex items-center gap-1 text-sm text-gray-500">
                          <Clock className="w-3 h-3" />
                          {post.reading_time} min
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={post.published ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                          {post.published ? t('published') : t('draft')}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          {/* View on site */}
                          {post.published && (
                            <a
                              href={`/blog/${post.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded"
                              title="Ver no site"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                          {/* Toggle publish */}
                          <button
                            onClick={() => handleToggle(post.id, post.published)}
                            disabled={togglingId === post.id}
                            className="p-2 text-gray-400 hover:text-green-600 transition-colors rounded disabled:opacity-50"
                            title={post.published ? 'Despublicar' : 'Publicar'}
                          >
                            {post.published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          {/* Edit */}
                          <Link
                            to={`/admin/blog/${post.id}`}
                            className="p-2 text-gray-400 hover:text-blue-600 transition-colors rounded"
                            title="Editar"
                          >
                            <Pencil className="w-4 h-4" />
                          </Link>
                          {/* Delete */}
                          <button
                            onClick={() => setDeletingId(post.id)}
                            className="p-2 text-gray-400 hover:text-red-600 transition-colors rounded"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deletingId} onOpenChange={(open) => { if (!open) setDeletingId(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir post?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação é permanente e não pode ser desfeita. O post será removido do blog público imediatamente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.click(); }} onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </AdminLayout>
    </AdminRoute>
  );
};

export default AdminBlogPage;
