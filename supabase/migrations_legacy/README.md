These SQL files are preserved for audit/reference only.

Why they were moved out of `supabase/migrations`:
- some used invalid filenames for the Supabase CLI migration pattern;
- others were experimental/duplicate variants that diverged from the remote canonical migration history;
- keeping them in the active migrations directory blocked `supabase migration list` and `supabase db push`.

The active migration chain is now:
- canonical files fetched from the remote history table in `supabase/migrations`;
- current supported migrations from 2026 onward in `supabase/migrations`.

Do not move files from this folder back into `supabase/migrations` unless you are intentionally rebuilding the migration history.
