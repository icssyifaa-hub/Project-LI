alter table public.tasks
add column if not exists job_group_id text;

create index if not exists tasks_job_group_id_idx
on public.tasks (job_group_id);

update public.tasks
set job_group_id = coalesce(nullif(job_order_number, ''), id::text)
where job_group_id is null;
