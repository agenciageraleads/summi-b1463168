import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface BlogPostRow {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  published_at: string;
  modified_at: string;
  author: string;
  reading_time: number;
  keywords: string;
  category: string;
  tags: string[];
  published: boolean;
  created_at: string;
  cover_image_url?: string | null;
}

export type BlogPostInput = Omit<BlogPostRow, 'id' | 'created_at'>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const BLOG_TABLE = 'blog_posts' as any;

export function useBlogAdmin() {
  const { toast } = useToast();
  const [posts, setPosts] = useState<BlogPostRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPosts = async () => {
    setIsLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from(BLOG_TABLE)
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível carregar os posts.', variant: 'destructive' });
    } else {
      setPosts(data ?? []);
    }
    setIsLoading(false);
  };

  useEffect(() => { fetchPosts(); }, []);

  const createPost = async (input: BlogPostInput): Promise<BlogPostRow | null> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from(BLOG_TABLE)
      .insert([{ ...input, modified_at: new Date().toISOString().split('T')[0] }])
      .select()
      .single();
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return null;
    }
    toast({ title: 'Post criado!', description: `"${input.title}" foi salvo com sucesso.` });
    await fetchPosts();
    return data;
  };

  const updatePost = async (id: string, input: Partial<BlogPostInput>): Promise<boolean> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from(BLOG_TABLE)
      .update({ ...input, modified_at: new Date().toISOString().split('T')[0] })
      .eq('id', id);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return false;
    }
    toast({ title: 'Post atualizado!', description: 'As alterações foram salvas.' });
    await fetchPosts();
    return true;
  };

  const deletePost = async (id: string): Promise<boolean> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from(BLOG_TABLE)
      .delete()
      .eq('id', id);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return false;
    }
    toast({ title: 'Post excluído.', description: 'O post foi removido permanentemente.' });
    await fetchPosts();
    return true;
  };

  const togglePublish = async (id: string, published: boolean): Promise<void> => {
    await updatePost(id, { published });
  };

  const getPostById = async (id: string): Promise<BlogPostRow | null> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from(BLOG_TABLE)
      .select('*')
      .eq('id', id)
      .single();
    if (error) return null;
    return data;
  };

  return { posts, isLoading, createPost, updatePost, deletePost, togglePublish, getPostById, refetch: fetchPosts };
}

// Public hook: only published posts, no auth required
export function useBlog() {
  const [posts, setPosts] = useState<BlogPostRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPublished = async () => {
      setIsLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: err } = await (supabase as any)
        .from(BLOG_TABLE)
        .select('*')
        .eq('published', true)
        .order('published_at', { ascending: false });
      if (err) {
        setError(err.message);
      } else {
        setPosts(data ?? []);
      }
      setIsLoading(false);
    };
    fetchPublished();
  }, []);

  const getPostBySlug = async (slug: string): Promise<BlogPostRow | null> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: err } = await (supabase as any)
      .from(BLOG_TABLE)
      .select('*')
      .eq('slug', slug)
      .eq('published', true)
      .single();
    if (err) return null;
    return data;
  };

  return { posts, isLoading, error, getPostBySlug };
}
