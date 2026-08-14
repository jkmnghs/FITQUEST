-- Shallow-merge helpers for user_profiles.state
--
-- The app state is a single JSONB blob with three writers: the browser
-- (auto-save every ~3s), the Quest agent (api/agent.js), and the coach quota
-- counter (api/coach.js). Each previously did a read-modify-write of the whole
-- column, so whichever wrote last silently destroyed the others' keys — most
-- visibly, the browser's auto-save erased agent messages written since its last
-- read, and reset the server-side quest quota back to its stale local value.
--
-- `state || patch` is a shallow top-level merge: the caller's keys replace
-- theirs, everything else is left alone. Callers patch only the keys they own.

-- Client-facing: acts on the caller's own row, identified by their JWT.
create or replace function public.merge_user_state(p_patch jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'merge_user_state requires an authenticated caller';
  end if;

  insert into public.user_profiles (id, state)
  values (auth.uid(), coalesce(p_patch, '{}'::jsonb))
  on conflict (id) do update
    set state = coalesce(public.user_profiles.state, '{}'::jsonb) || excluded.state;
end;
$$;

-- Supabase's default privileges grant EXECUTE on new public-schema functions
-- directly to `anon` and `authenticated`; `revoke ... from public` does not
-- remove those direct grants, so anon must be revoked explicitly. The function
-- already fails closed (it raises when auth.uid() is null), but an
-- unauthenticated caller should not reach a SECURITY DEFINER function at all.
revoke all on function public.merge_user_state(jsonb) from public;
revoke execute on function public.merge_user_state(jsonb) from anon;
grant execute on function public.merge_user_state(jsonb) to authenticated;

-- Server-only: lets the service role patch a specific user's row. Explicitly
-- not granted to anon/authenticated so a browser cannot target another user.
create or replace function public.admin_merge_user_state(p_user_id uuid, p_patch jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, state)
  values (p_user_id, coalesce(p_patch, '{}'::jsonb))
  on conflict (id) do update
    set state = coalesce(public.user_profiles.state, '{}'::jsonb) || excluded.state;
end;
$$;

revoke all on function public.admin_merge_user_state(uuid, jsonb) from public;
revoke all on function public.admin_merge_user_state(uuid, jsonb) from anon;
revoke all on function public.admin_merge_user_state(uuid, jsonb) from authenticated;
grant execute on function public.admin_merge_user_state(uuid, jsonb) to service_role;
