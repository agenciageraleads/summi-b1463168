import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AdminRoute } from '@/components/Admin/AdminRoute';
import { AdminLayout } from '@/components/Admin/AdminLayout';
import { useBlogAdmin, BlogPostInput } from '@/hooks/useBlogAdmin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const CATEGORIES = ['Produtividade', 'Tutoriais', 'Negócios', 'Tecnologia'];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function estimateReadingTime(content: string): number {
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

const emptyForm: BlogPostInput = {
  slug: '',
  title: '',
  excerpt: '',
  content: '',
  published_at: new Date().toISOString().split('T')[0],
  modified_at: new Date().toISOString().split('T')[0],
  author: 'Equipe Summi',
  reading_time: 5,
  keywords: '',
  category: 'Produtividade',
  tags: [],
  published: false,
};

const AdminBlogFormPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { createPost, updatePost, getPostById } = useBlogAdmin();
  const isEditing = !!id && id !== 'new';

  const [form, setForm] = useState<BlogPostInput>(emptyForm);
  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');

  useEffect(() => {
    if (!isEditing) return;
    getPostById(id).then((post) => {
      if (post) {
        const { id: _id, created_at: _ca, ...rest } = post;
        setForm(rest);
        setSlugManuallyEdited(true);
      }
      setIsLoading(false);
    });
  }, [id]);

  const set = (field: keyof BlogPostInput, value: unknown) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleTitleChange = (value: string) => {
    set('title', value);
    if (!slugManuallyEdited) {
      set('slug', slugify(value));
    }
    set('reading_time', estimateReadingTime(form.content));
  };

  const handleContentChange = (value: string) => {
    set('content', value);
    set('reading_time', estimateReadingTime(value));
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !form.tags.includes(tag)) {
      set('tags', [...form.tags, tag]);
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    set('tags', form.tags.filter(t => t !== tag));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.slug || !form.content) return;
    setIsSaving(true);
    let ok = false;
    if (isEditing) {
      ok = await updatePost(id, form);
    } else {
      const result = await createPost(form);
      ok = !!result;
    }
    setIsSaving(false);
    if (ok) navigate('/admin/blog');
  };

  if (isLoading) {
    return (
      <AdminRoute>
        <AdminLayout>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
          </div>
        </AdminLayout>
      </AdminRoute>
    );
  }

  return (
    <AdminRoute>
      <AdminLayout>
        <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/admin/blog" className="text-gray-400 hover:text-gray-600 transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {isEditing ? 'Editar Post' : 'Novo Post'}
                </h1>
                <p className="text-sm text-gray-500">
                  {isEditing ? 'Atualize o conteúdo e salve.' : 'Preencha os campos e publique.'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {form.published ? (
                  <Eye className="w-4 h-4 text-green-600" />
                ) : (
                  <EyeOff className="w-4 h-4 text-gray-400" />
                )}
                <Switch
                  checked={form.published}
                  onCheckedChange={(v) => set('published', v)}
                />
                <span className="text-sm font-medium text-gray-700">
                  {form.published ? 'Publicado' : 'Rascunho'}
                </span>
              </div>
              <Button
                type="submit"
                disabled={isSaving || !form.title || !form.slug || !form.content}
                className="bg-green-600 hover:bg-green-700 text-white gap-2"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main content */}
            <div className="lg:col-span-2 space-y-5">
              {/* Title */}
              <div className="space-y-1.5">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Título do post..."
                  required
                  className="text-lg"
                />
              </div>

              {/* Slug */}
              <div className="space-y-1.5">
                <Label htmlFor="slug">
                  Slug (URL) *
                  <span className="text-xs text-gray-400 font-normal ml-2">
                    /blog/<strong>{form.slug || '...'}</strong>
                  </span>
                </Label>
                <Input
                  id="slug"
                  value={form.slug}
                  onChange={(e) => {
                    set('slug', slugify(e.target.value));
                    setSlugManuallyEdited(true);
                  }}
                  placeholder="meu-post-url"
                  required
                />
              </div>

              {/* Excerpt */}
              <div className="space-y-1.5">
                <Label htmlFor="excerpt">
                  Resumo / Excerpt *
                  <span className="text-xs text-gray-400 font-normal ml-2">
                    Aparece nos cards e no Google ({form.excerpt.length}/160 chars)
                  </span>
                </Label>
                <Textarea
                  id="excerpt"
                  value={form.excerpt}
                  onChange={(e) => set('excerpt', e.target.value)}
                  placeholder="Uma frase que resume o artigo..."
                  rows={3}
                  required
                  maxLength={320}
                />
              </div>

              {/* Content */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="content">
                    Conteúdo * (Markdown)
                    <span className="text-xs text-gray-400 font-normal ml-2">
                      ~{form.reading_time} min de leitura
                    </span>
                  </Label>
                  <div className="flex rounded-md overflow-hidden border border-gray-200 text-xs">
                    <button
                      type="button"
                      onClick={() => setActiveTab('edit')}
                      className={`px-3 py-1 ${activeTab === 'edit' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('preview')}
                      className={`px-3 py-1 ${activeTab === 'preview' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                      Preview
                    </button>
                  </div>
                </div>

                {activeTab === 'edit' ? (
                  <Textarea
                    id="content"
                    value={form.content}
                    onChange={(e) => handleContentChange(e.target.value)}
                    placeholder={`## Introdução\n\nEscreva o conteúdo em Markdown...\n\n## Seção 2\n\nUse ## para títulos, **negrito**, - para listas.`}
                    rows={24}
                    required
                    className="font-mono text-sm"
                  />
                ) : (
                  <div
                    className="min-h-[400px] border border-gray-200 rounded-md p-4 prose prose-sm max-w-none overflow-auto bg-white"
                    dangerouslySetInnerHTML={{
                      __html: form.content
                        .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-6 mb-2">$1</h2>')
                        .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-1">$1</h3>')
                        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                        .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
                        .replace(/\n\n/g, '<br/><br/>'),
                    }}
                  />
                )}

                <p className="text-xs text-gray-400">
                  Use <code>## Título</code>, <code>### Subtítulo</code>, <code>**negrito**</code>, <code>- item de lista</code>
                </p>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-5">
              {/* Publish date */}
              <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
                <h3 className="font-semibold text-gray-900 text-sm">Publicação</h3>
                <div className="space-y-1.5">
                  <Label htmlFor="published_at" className="text-xs">Data de publicação</Label>
                  <Input
                    id="published_at"
                    type="date"
                    value={form.published_at}
                    onChange={(e) => set('published_at', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="author" className="text-xs">Autor</Label>
                  <Input
                    id="author"
                    value={form.author}
                    onChange={(e) => set('author', e.target.value)}
                  />
                </div>
              </div>

              {/* Category */}
              <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
                <h3 className="font-semibold text-gray-900 text-sm">Categoria</h3>
                <Select value={form.category} onValueChange={(v) => set('category', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tags */}
              <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
                <h3 className="font-semibold text-gray-900 text-sm">Tags</h3>
                <div className="flex gap-2">
                  <Input
                    aria-label="Adicionar tag"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                    placeholder="Nova tag..."
                    className="text-sm"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={addTag}>+</Button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {form.tags.map(tag => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="cursor-pointer hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors text-xs"
                      onClick={() => removeTag(tag)}
                    >
                      {tag} ×
                    </Badge>
                  ))}
                </div>
              </div>

              {/* SEO */}
              <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
                <h3 className="font-semibold text-gray-900 text-sm">SEO</h3>
                <div className="space-y-1.5">
                  <Label htmlFor="keywords" className="text-xs">Palavras-chave</Label>
                  <Textarea
                    id="keywords"
                    value={form.keywords}
                    onChange={(e) => set('keywords', e.target.value)}
                    placeholder="palavra1, palavra2, ..."
                    rows={3}
                    className="text-sm"
                  />
                  <p className="text-xs text-gray-400">Separadas por vírgula</p>
                </div>
              </div>

              {/* Preview card */}
              {form.title && (
                <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Preview Google</p>
                  <p className="text-blue-700 text-sm font-medium leading-snug line-clamp-2">
                    {form.title} | Summi
                  </p>
                  <p className="text-green-700 text-xs">summi.com.br/blog/{form.slug}</p>
                  <p className="text-gray-600 text-xs leading-relaxed line-clamp-2">
                    {form.excerpt || 'Adicione um resumo para aparecer aqui...'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </form>
      </AdminLayout>
    </AdminRoute>
  );
};

export default AdminBlogFormPage;
