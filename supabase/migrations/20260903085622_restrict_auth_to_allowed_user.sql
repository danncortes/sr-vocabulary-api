create schema if not exists private;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to supabase_auth_admin;

create table if not exists private.auth_user_allowlist (
    email text primary key,
    constraint auth_user_allowlist_normalized_email
        check (email = lower(trim(email)))
);

revoke all on table private.auth_user_allowlist
from public, anon, authenticated;
grant select on table private.auth_user_allowlist to supabase_auth_admin;

create or replace function private.hook_restrict_auth_user(event jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
    incoming_email text := lower(trim(event->'user'->>'email'));
begin
    if exists (
        select 1
        from private.auth_user_allowlist
        where email = incoming_email
    ) then
        return '{}'::jsonb;
    end if;

    return jsonb_build_object(
        'error', jsonb_build_object(
            'http_code', 403,
            'message', 'This account is not authorized to use the application.'
        )
    );
end;
$$;

revoke execute on function private.hook_restrict_auth_user(jsonb)
from public, anon, authenticated;
grant execute on function private.hook_restrict_auth_user(jsonb)
to supabase_auth_admin;

comment on function private.hook_restrict_auth_user(jsonb) is
'Before User Created auth hook backed by a private email allowlist.';
