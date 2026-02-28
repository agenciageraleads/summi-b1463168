
-- Add instance_name column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN instance_name TEXT;
;
