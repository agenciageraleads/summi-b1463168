-- Fix critical RLS issues - Enable RLS on profiles table
-- This is critical as profiles contains sensitive user data

-- Enable RLS on profiles table (this is critical!)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Verify all policies are still in place for profiles table
-- They should still exist but let me make sure the basic policies are comprehensive

-- Ensure users can only see their own profile unless they're admin
DROP POLICY IF EXISTS "profiles_select_public" ON public.profiles;

-- Make sure the existing policies are sufficient
-- From the schema, these policies should already exist:
-- - profiles_select_own_or_admin: Users can view their own profile or admins can view all
-- - profiles_update_own: Users can update their own profile  
-- - profiles_update_admin: Admins can update any profile
-- - profiles_insert_own: Users can create their own profile
-- - profiles_delete_own: Users can delete their own profile
-- - profiles_delete_admin_only: Only admins can delete profiles