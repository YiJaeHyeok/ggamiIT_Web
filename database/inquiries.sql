-- 문의는 등록만 공개하고, 조회/수정/삭제는 관리 계정으로만 수행합니다.
create table public.inquiries (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null constraint inquiries_request_id_key unique,
  name text not null default '' check (char_length(name) <= 80),
  email text not null check (
    char_length(email) between 3 and 254
    and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ),
  subject text not null check (char_length(btrim(subject)) between 2 and 120),
  message text not null check (char_length(btrim(message)) between 10 and 5000),
  consent boolean not null check (consent is true),
  status text not null default 'new' check (status in ('new', 'reviewing', 'replied', 'closed')),
  created_at timestamptz not null default now()
);

create index inquiries_created_at_idx on public.inquiries (created_at desc);
alter table public.inquiries enable row level security;
revoke all on public.inquiries from anon, authenticated;
grant insert (request_id, name, email, subject, message, consent) on public.inquiries to anon;
grant all on public.inquiries to service_role;

create policy "Visitors may submit a valid inquiry"
on public.inquiries for insert to anon
with check (consent is true);

comment on table public.inquiries is 'NOVA 웹사이트 문의. 방문자 조회 정책이 없어 문의 내용은 공개되지 않습니다.';
comment on column public.inquiries.request_id is '재시도 시 중복 저장을 방지하는 클라이언트 생성 UUID';
