-- Add cover_image_url column to blog_posts for auto-generated blog images
ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
