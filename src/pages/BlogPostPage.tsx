import { useParams, Link, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Calendar, ArrowLeft, ArrowRight } from "lucide-react";
import { useBlog, BlogPostRow } from "@/hooks/useBlogAdmin";
import { blogPosts as staticPosts } from "@/data/blogPosts";
import { SEO } from "@/components/SEO";

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function renderMarkdown(content: string): string {
  return content
    .trim()
    .replace(/^## (.+)$/gm, '<h2 class="text-2xl font-bold text-gray-900 mt-10 mb-4">$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 class="text-xl font-semibold text-gray-800 mt-8 mb-3">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/^- (.+)$/gm, '<li class="mb-1">$1</li>')
    .replace(/(<li[^>]*>.*<\/li>\n?)+/g, (match) =>
      `<ul class="list-disc pl-6 my-4 space-y-1 text-gray-700">${match}</ul>`
    )
    .split("\n\n")
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return "";
      if (trimmed.startsWith("<")) return trimmed;
      return `<p class="text-gray-700 leading-relaxed mb-4">${trimmed}</p>`;
    })
    .join("\n");
}

const categoryColors: Record<string, string> = {
  Produtividade: "bg-green-100 text-green-700 border-green-200",
  Tutoriais: "bg-blue-100 text-blue-700 border-blue-200",
  Negócios: "bg-purple-100 text-purple-700 border-purple-200",
  Tecnologia: "bg-orange-100 text-orange-700 border-orange-200",
};

const BlogPostPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { posts: dbPosts, isLoading: dbLoading, getPostBySlug } = useBlog();
  const [post, setPost] = useState<BlogPostRow | null>(null);
  const [allPosts, setAllPosts] = useState<BlogPostRow[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!slug) { setNotFound(true); setIsLoading(false); return; }

    const loadPost = async () => {
      const found = await getPostBySlug(slug);
      if (found) {
        setPost(found);
      } else {
        // fallback to static
        const s = staticPosts.find(p => p.slug === slug);
        if (s) {
          setPost({
            id: s.slug, slug: s.slug, title: s.title, excerpt: s.excerpt,
            content: s.content, published_at: s.publishedAt, modified_at: s.modifiedAt,
            author: s.author, reading_time: s.readingTime, keywords: s.keywords,
            category: s.category, tags: s.tags, published: true,
            created_at: s.publishedAt,
          });
        } else {
          setNotFound(true);
        }
      }
      setIsLoading(false);
    };

    loadPost();
  }, [slug]);

  // Build ordered list for prev/next
  useEffect(() => {
    if (!dbLoading) {
      if (dbPosts.length > 0) {
        setAllPosts(dbPosts);
      } else {
        setAllPosts(staticPosts.map(p => ({
          id: p.slug, slug: p.slug, title: p.title, excerpt: p.excerpt,
          content: p.content, published_at: p.publishedAt, modified_at: p.modifiedAt,
          author: p.author, reading_time: p.readingTime, keywords: p.keywords,
          category: p.category, tags: p.tags, published: true, created_at: p.publishedAt,
        })));
      }
    }
  }, [dbPosts, dbLoading]);

  if (notFound) return <Navigate to="/blog" replace />;

  if (isLoading || !post) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    );
  }

  const currentIndex = allPosts.findIndex(p => p.slug === post.slug);
  const prevPost = currentIndex > 0 ? allPosts[currentIndex - 1] : null;
  const nextPost = currentIndex < allPosts.length - 1 ? allPosts[currentIndex + 1] : null;

  const htmlContent = renderMarkdown(post.content);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    image: post.cover_image_url || undefined,
    author: { "@type": "Organization", name: post.author },
    publisher: {
      "@type": "Organization",
      name: "Summi",
      logo: {
        "@type": "ImageObject",
        url: "https://summi.com.br/lovable-uploads/8d37281c-dfb2-4e98-93c9-888cccd6a706.png",
      },
    },
    datePublished: post.published_at,
    dateModified: post.modified_at,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://summi.com.br/blog/${post.slug}`,
    },
    keywords: post.keywords,
    articleSection: post.category,
  };

  return (
    <div className="min-h-screen bg-white">
      <SEO
        title={post.title}
        description={post.excerpt}
        keywords={post.keywords}
        canonicalPath={`/blog/${post.slug}`}
        ogType="article"
        publishedAt={post.published_at}
        modifiedAt={post.modified_at}
        author={post.author}
        ogImage={post.cover_image_url || undefined}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Nav */}
      <nav className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center space-x-3">
              <div className="w-8 h-8">
                <img
                  src="/lovable-uploads/8d37281c-dfb2-4e98-93c9-888cccd6a706.png"
                  alt="Summi Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-xl font-bold text-green-600">Summi</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link to="/blog" className="text-gray-600 hover:text-green-600 transition-colors text-sm">
                ← Blog
              </Link>
              <Link to="/login">
                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                  Começar Grátis
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Article */}
      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-8">
          <Link to="/" className="hover:text-green-600 transition-colors">Início</Link>
          <span>/</span>
          <Link to="/blog" className="hover:text-green-600 transition-colors">Blog</Link>
          <span>/</span>
          <span className="text-gray-800 truncate">{post.title}</span>
        </nav>

        {/* Category & Meta */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <Badge className={categoryColors[post.category] || "bg-gray-100 text-gray-700"}>
            {post.category}
          </Badge>
          <span className="flex items-center gap-1 text-sm text-gray-500">
            <Clock className="w-3.5 h-3.5" />
            {post.reading_time} min de leitura
          </span>
          <span className="flex items-center gap-1 text-sm text-gray-500">
            <Calendar className="w-3.5 h-3.5" />
            {formatDate(post.published_at)}
          </span>
        </div>

        {/* Title */}
        <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 leading-tight mb-6">
          {post.title}
        </h1>

        {/* Cover image */}
        {post.cover_image_url && (
          <div className="mb-8 rounded-xl overflow-hidden">
            <img
              src={post.cover_image_url}
              alt={post.title}
              className="w-full h-64 sm:h-80 object-cover"
            />
          </div>
        )}

        {/* Excerpt */}
        <p className="text-xl text-gray-600 leading-relaxed mb-8 pb-8 border-b border-gray-100">
          {post.excerpt}
        </p>

        {/* Author */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
            <img
              src="/lovable-uploads/8d37281c-dfb2-4e98-93c9-888cccd6a706.png"
              alt="Summi"
              className="w-7 h-7 object-contain"
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{post.author}</p>
            <p className="text-xs text-gray-500">Atualizado em {formatDate(post.modified_at)}</p>
          </div>
        </div>

        {/* Body */}
        <div
          className="prose prose-green max-w-none"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />

        {/* Tags */}
        <div className="mt-10 pt-6 border-t border-gray-100">
          <p className="text-sm text-gray-500 mb-2">Tags:</p>
          <div className="flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-gray-600 border-gray-200">
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        {/* Prev / Next */}
        <div className="mt-12 grid grid-cols-2 gap-4">
          {prevPost ? (
            <Link to={`/blog/${prevPost.slug}`} className="group">
              <div className="p-4 rounded-lg border border-gray-200 hover:border-green-300 transition-all h-full">
                <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                  <ArrowLeft className="w-3 h-3" /> Anterior
                </p>
                <p className="text-sm font-medium text-gray-800 group-hover:text-green-700 transition-colors leading-snug">
                  {prevPost.title}
                </p>
              </div>
            </Link>
          ) : <div />}
          {nextPost ? (
            <Link to={`/blog/${nextPost.slug}`} className="group col-start-2">
              <div className="p-4 rounded-lg border border-gray-200 hover:border-green-300 transition-all text-right h-full">
                <p className="text-xs text-gray-500 mb-1 flex items-center justify-end gap-1">
                  Próximo <ArrowRight className="w-3 h-3" />
                </p>
                <p className="text-sm font-medium text-gray-800 group-hover:text-green-700 transition-colors leading-snug">
                  {nextPost.title}
                </p>
              </div>
            </Link>
          ) : <div />}
        </div>
      </article>

      {/* CTA */}
      <div className="bg-gradient-to-br from-green-50 to-white py-16 mt-8">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Experimente a Summi gratuitamente
          </h2>
          <p className="text-gray-600 mb-8">
            7 dias grátis para descobrir como a IA pode transformar sua produtividade no WhatsApp.
          </p>
          <Link to="/login">
            <Button
              size="lg"
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg"
            >
              Começar Grátis
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link to="/blog" className="flex items-center gap-2 text-green-600 hover:text-green-700 transition-colors font-medium">
          <ArrowLeft className="w-4 h-4" />
          Voltar para o Blog
        </Link>
      </div>

      {/* Footer */}
      <footer className="bg-emerald-950 text-white py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <img src="/lovable-uploads/8d37281c-dfb2-4e98-93c9-888cccd6a706.png" alt="Summi Logo" className="w-7 h-7 object-contain" />
            <span className="font-bold">Summi</span>
          </div>
          <p className="text-gray-400 text-sm">© 2026 Summi. Todos os direitos reservados.</p>
          <div className="flex gap-4 text-sm text-gray-400">
            <Link to="/" className="hover:text-white transition-colors">Início</Link>
            <Link to="/blog" className="hover:text-white transition-colors">Blog</Link>
            <Link to="/terms" className="hover:text-white transition-colors">Termos</Link>
            <Link to="/privacy" className="hover:text-white transition-colors">Privacidade</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default BlogPostPage;
