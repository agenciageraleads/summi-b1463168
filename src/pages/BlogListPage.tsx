import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, ArrowRight, Calendar } from "lucide-react";
import { useBlog } from "@/hooks/useBlogAdmin";
import { blogPosts as staticPosts } from "@/data/blogPosts";
import { SEO } from "@/components/SEO";

const categoryColors: Record<string, string> = {
  Produtividade: "bg-green-100 text-green-700 border-green-200",
  Tutoriais: "bg-blue-100 text-blue-700 border-blue-200",
  Negócios: "bg-purple-100 text-purple-700 border-purple-200",
  Tecnologia: "bg-orange-100 text-orange-700 border-orange-200",
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

const BlogListPage = () => {
  const { posts: dbPosts, isLoading } = useBlog();

  // Use DB posts if available, fallback to static data
  const posts = !isLoading && dbPosts.length > 0 ? dbPosts : isLoading ? [] : staticPosts.map(p => ({
    ...p,
    id: p.slug,
    published: true,
    published_at: p.publishedAt,
    modified_at: p.modifiedAt,
    reading_time: p.readingTime,
    created_at: p.publishedAt,
  }));

  const featuredPost = posts[0];
  const otherPosts = posts.slice(1);

  return (
    <div className="min-h-screen bg-white">
      <SEO
        title="Blog Summi - Dicas de Produtividade e WhatsApp Business com IA"
        description="Aprenda a usar o WhatsApp de forma mais produtiva com IA. Dicas, tutoriais e estratégias para profissionais e empresas que usam WhatsApp Business."
        keywords="blog whatsapp business, dicas whatsapp, produtividade whatsapp, ia whatsapp, automacao whatsapp"
        canonicalPath="/blog"
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
              <Link to="/" className="text-gray-600 hover:text-green-600 transition-colors text-sm">
                Início
              </Link>
              <Link to="/login">
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Começar Grátis
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Header */}
      <div className="bg-gradient-to-br from-green-50 to-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="mb-4 bg-green-100 text-green-700 border-green-200">
            Blog Summi
          </Badge>
          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Produtividade e IA para WhatsApp
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Dicas, tutoriais e estratégias para profissionais e empresas que usam WhatsApp Business.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
          </div>
        ) : !featuredPost ? (
          <p className="text-center text-gray-500 py-20">Nenhum post publicado ainda.</p>
        ) : (
          <>
            {/* Featured Post */}
            <div className="mb-16">
              <h2 className="text-sm font-semibold text-green-600 uppercase tracking-wider mb-6">
                Artigo em Destaque
              </h2>
              <Link to={`/blog/${featuredPost.slug}`} className="group block">
                <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 border-gray-200 group-hover:border-green-300">
                  {featuredPost.cover_image_url && (
                    <div className="h-56 overflow-hidden">
                      <img
                        src={featuredPost.cover_image_url}
                        alt={featuredPost.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  )}
                  <div className="p-8">
                    <div className="flex items-center gap-3 mb-4">
                      <Badge className={categoryColors[featuredPost.category] || "bg-gray-100 text-gray-700"}>
                        {featuredPost.category}
                      </Badge>
                      <span className="flex items-center gap-1 text-sm text-gray-500">
                        <Clock className="w-3 h-3" />
                        {featuredPost.reading_time} min de leitura
                      </span>
                    </div>
                    <h3 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-4 group-hover:text-green-700 transition-colors">
                      {featuredPost.title}
                    </h3>
                    <p className="text-gray-600 text-lg leading-relaxed mb-6">
                      {featuredPost.excerpt}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(featuredPost.published_at)}</span>
                        <span>·</span>
                        <span>{featuredPost.author}</span>
                      </div>
                      <span className="flex items-center gap-1 text-green-600 font-medium group-hover:gap-2 transition-all">
                        Ler artigo <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </Card>
              </Link>
            </div>

            {/* Other Posts Grid */}
            {otherPosts.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-green-600 uppercase tracking-wider mb-6">
                  Todos os Artigos
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {otherPosts.map((post) => (
                    <Link key={post.slug} to={`/blog/${post.slug}`} className="group block">
                      <Card className="h-full hover:shadow-lg transition-all duration-300 border-gray-200 group-hover:border-green-300 overflow-hidden">
                        {post.cover_image_url && (
                          <div className="h-40 overflow-hidden">
                            <img
                              src={post.cover_image_url}
                              alt={post.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          </div>
                        )}
                        <CardHeader className="pb-3">
                          <div className="flex items-center gap-2 mb-3">
                            <Badge
                              className={`text-xs ${categoryColors[post.category] || "bg-gray-100 text-gray-700"}`}
                            >
                              {post.category}
                            </Badge>
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <Clock className="w-3 h-3" />
                              {post.reading_time} min
                            </span>
                          </div>
                          <CardTitle className="text-lg text-gray-900 group-hover:text-green-700 transition-colors leading-snug">
                            {post.title}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-gray-600 text-sm leading-relaxed mb-4 line-clamp-3">
                            {post.excerpt}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400">
                              {formatDate(post.published_at)}
                            </span>
                            <span className="flex items-center gap-1 text-green-600 text-sm font-medium group-hover:gap-2 transition-all">
                              Ler <ArrowRight className="w-3 h-3" />
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* CTA */}
        <div className="mt-20 text-center bg-gradient-to-br from-green-50 to-white rounded-2xl p-12 border border-green-100">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Pronto para ser mais produtivo no WhatsApp?
          </h2>
          <p className="text-gray-600 mb-8 text-lg max-w-xl mx-auto">
            Experimente a Summi gratuitamente por 7 dias e descubra como a IA pode transformar sua gestão do WhatsApp.
          </p>
          <Link to="/login">
            <Button
              size="lg"
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg px-8"
            >
              Começar Grátis por 7 Dias
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-emerald-950 text-white py-10 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <img
              src="/lovable-uploads/8d37281c-dfb2-4e98-93c9-888cccd6a706.png"
              alt="Summi Logo"
              className="w-7 h-7 object-contain"
            />
            <span className="font-bold">Summi</span>
          </div>
          <p className="text-gray-400 text-sm">
            © 2026 Summi. Todos os direitos reservados.
          </p>
          <div className="flex gap-4 text-sm text-gray-400">
            <Link to="/" className="hover:text-white transition-colors">Início</Link>
            <Link to="/terms" className="hover:text-white transition-colors">Termos</Link>
            <Link to="/privacy" className="hover:text-white transition-colors">Privacidade</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default BlogListPage;
