import { Helmet } from "react-helmet-async";

interface SEOProps {
  title: string;
  description: string;
  keywords?: string;
  canonicalPath?: string;
  ogImage?: string;
  ogType?: "website" | "article";
  publishedAt?: string;
  modifiedAt?: string;
  author?: string;
  noIndex?: boolean;
}

const BASE_URL = "https://summi.com.br";
const DEFAULT_IMAGE = `${BASE_URL}/lovable-uploads/8d37281c-dfb2-4e98-93c9-888cccd6a706.png`;

export function SEO({
  title,
  description,
  keywords,
  canonicalPath = "/",
  ogImage = DEFAULT_IMAGE,
  ogType = "website",
  publishedAt,
  modifiedAt,
  author,
  noIndex = false,
}: SEOProps) {
  const fullTitle = title.includes("Summi") ? title : `${title} | Summi`;
  const canonicalUrl = `${BASE_URL}${canonicalPath}`;

  const schemaData = {
    "@context": "https://schema.org",
    "@type": ogType === "article" ? "Article" : "SoftwareApplication",
    "headline": title,
    "description": description,
    "image": ogImage,
    "url": canonicalUrl,
    "author": author ? { "@type": "Person", "name": author } : { "@type": "Organization", "name": "Summi" },
    "publisher": {
      "@type": "Organization",
      "name": "Summi",
      "logo": {
        "@type": "ImageObject",
        "url": DEFAULT_IMAGE
      }
    },
    ...(ogType === "article" && {
      "datePublished": publishedAt,
      "dateModified": modifiedAt || publishedAt
    })
  };

  return (
    <Helmet>
      <html lang="pt-BR" />
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="author" content={author || "Summi Team"} />
      {keywords && <meta name="keywords" content={keywords} />}
      <meta name="robots" content={noIndex ? "noindex, nofollow" : "index, follow"} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:locale" content="pt_BR" />
      <meta property="og:site_name" content="Summi" />

      {/* JSON-LD Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(schemaData)}
      </script>

      {/* Article specific */}
      {ogType === "article" && publishedAt && (
        <meta property="article:published_time" content={publishedAt} />
      )}
      {ogType === "article" && modifiedAt && (
        <meta property="article:modified_time" content={modifiedAt} />
      )}
      {ogType === "article" && author && (
        <meta property="article:author" content={author} />
      )}

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@summi_ai" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
}
