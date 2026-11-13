select
  c.relname as table_name,
  c.relkind,
  array_agg(distinct (a.grantee::regrole::text || ':' || a.privilege_type))
    filter (where a.grantee::regrole::text in ('anon', 'authenticated')) as grants
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join lateral aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) a on true
where n.nspname = 'public'
  and c.relkind in ('r', 'v')
group by c.relname, c.relkind
order by c.relname;
