-- Enable RLS everywhere. Backend service-role operations must still enforce app authorization.
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.order_status_history enable row level security;
alter table public.order_qr_tokens enable row level security;
alter table public.email_delivery_logs enable row level security;
alter table public.promo_codes enable row level security;
alter table public.audit_logs enable row level security;

create policy "profiles read self" on public.profiles for select to authenticated using (id=auth.uid());
create policy "profiles update own basic fields" on public.profiles for update to authenticated using (id=auth.uid()) with check (id=auth.uid() and role='customer');
create policy "active categories public read" on public.categories for select to anon,authenticated using (is_active=true);
create policy "available menu public read" on public.menu_items for select to anon,authenticated using (is_available=true);
create policy "customer reads own orders" on public.orders for select to authenticated using (customer_id=auth.uid());
create policy "customer reads own order items" on public.order_items for select to authenticated using (exists(select 1 from public.orders o where o.id=order_id and o.customer_id=auth.uid()));
create policy "customer reads own payments" on public.payments for select to authenticated using (customer_id=auth.uid());
create policy "customer reads own status history" on public.order_status_history for select to authenticated using (exists(select 1 from public.orders o where o.id=order_id and o.customer_id=auth.uid()));
-- No client insert/update/delete policies for orders, payments, stock, QR tokens, email logs, or audit logs.
-- Use backend routes for privileged operations; service-role key is server-only.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('menu-images','menu-images',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;
create policy "public can view menu images" on storage.objects for select to anon,authenticated using (bucket_id='menu-images');
create policy "staff can upload menu images" on storage.objects for insert to authenticated with check (
 bucket_id='menu-images' and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('owner','admin','staff'))
);
create policy "staff can update menu images" on storage.objects for update to authenticated using (
 bucket_id='menu-images' and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('owner','admin','staff'))
) with check (
 bucket_id='menu-images' and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('owner','admin','staff'))
);
create policy "staff can delete menu images" on storage.objects for delete to authenticated using (
 bucket_id='menu-images' and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('owner','admin','staff'))
);
