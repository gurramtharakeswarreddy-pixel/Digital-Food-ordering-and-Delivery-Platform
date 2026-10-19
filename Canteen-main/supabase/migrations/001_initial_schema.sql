-- The Panesh Kitchen initial schema. Apply with Supabase CLI or SQL editor.
create extension if not exists pgcrypto;

do $$ begin create type public.app_role as enum ('customer','staff','admin','owner'); exception when duplicate_object then null; end $$;
do $$ begin create type public.order_status as enum ('pending','confirmed','preparing','ready_for_pickup','completed','cancelled'); exception when duplicate_object then null; end $$;
do $$ begin create type public.payment_status as enum ('pending','paid','failed','cancelled','refund_pending','refunded'); exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null default '',
 role public.app_role not null default 'customer',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.categories (
 id uuid primary key default gen_random_uuid(),
 name text not null unique,
 description text,
 sort_order int not null default 0,
 is_active boolean not null default true,
 created_at timestamptz not null default now()
);
create table if not exists public.menu_items (
 id uuid primary key default gen_random_uuid(),
 category_id uuid references public.categories(id) on delete set null,
 name text not null,
 description text not null default '',
 price numeric(12,2) not null check(price >= 0),
 image_url text,
 is_vegetarian boolean not null default true,
 is_available boolean not null default true,
 stock_quantity int not null default 0 check(stock_quantity >= 0),
 low_stock_threshold int not null default 5 check(low_stock_threshold >= 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.orders (
 id uuid primary key default gen_random_uuid(),
 order_number text not null unique,
 customer_id uuid not null references public.profiles(id),
 order_email text not null,
 status public.order_status not null default 'pending',
 payment_status public.payment_status not null default 'pending',
 payment_method text not null check(payment_method in ('counter','razorpay')),
 subtotal numeric(12,2) not null check(subtotal >= 0),
 discount_amount numeric(12,2) not null default 0 check(discount_amount >= 0),
 tax_amount numeric(12,2) not null default 0 check(tax_amount >= 0),
 total_amount numeric(12,2) not null check(total_amount >= 0),
 currency text not null default 'INR',
 notes text,
 idempotency_key text not null,
 stock_released boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(customer_id,idempotency_key)
);
create table if not exists public.order_items (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.orders(id) on delete cascade,
 menu_item_id uuid references public.menu_items(id) on delete set null,
 item_name text not null,
 unit_price numeric(12,2) not null check(unit_price >= 0),
 quantity int not null check(quantity > 0),
 line_total numeric(12,2) not null check(line_total >= 0),
 created_at timestamptz not null default now()
);
create table if not exists public.payments (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.orders(id),
 customer_id uuid not null references public.profiles(id),
 provider text not null check(provider in ('counter','razorpay')),
 provider_order_id text unique,
 provider_payment_id text unique,
 status public.payment_status not null default 'pending',
 amount numeric(12,2) not null check(amount >= 0),
 currency text not null default 'INR',
 provider_payload jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.inventory_movements (
 id uuid primary key default gen_random_uuid(),
 menu_item_id uuid references public.menu_items(id) on delete set null,
 order_id uuid references public.orders(id) on delete set null,
 actor_id uuid references public.profiles(id) on delete set null,
 quantity_delta int not null,
 reason text not null,
 created_at timestamptz not null default now()
);
create table if not exists public.order_status_history (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.orders(id) on delete cascade,
 actor_id uuid references public.profiles(id) on delete set null,
 old_status public.order_status,
 new_status public.order_status not null,
 note text,
 created_at timestamptz not null default now()
);
create table if not exists public.order_qr_tokens (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null unique references public.orders(id) on delete cascade,
 token_hash text not null unique,
 expires_at timestamptz not null default (now()+interval '180 days'),
 revoked_at timestamptz,
 collected_at timestamptz,
 collected_by uuid references public.profiles(id),
 created_at timestamptz not null default now()
);
create table if not exists public.email_delivery_logs (
 id uuid primary key default gen_random_uuid(),
 order_id uuid references public.orders(id) on delete set null,
 recipient text not null,
 provider text not null,
 provider_message_id text,
 status text not null check(status in ('queued','sent','failed','retrying')),
 attempts int not null default 0,
 last_error text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.promo_codes (
 id uuid primary key default gen_random_uuid(),
 code text not null unique,
 discount_type text not null check(discount_type in ('percent','fixed')),
 discount_value numeric(12,2) not null check(discount_value >= 0),
 min_order_amount numeric(12,2) not null default 0,
 max_discount numeric(12,2),
 starts_at timestamptz,
 expires_at timestamptz,
 usage_limit int,
 usage_count int not null default 0,
 is_active boolean not null default true
);
create table if not exists public.audit_logs (
 id uuid primary key default gen_random_uuid(),
 actor_id uuid references public.profiles(id) on delete set null,
 action text not null,
 entity_type text not null,
 entity_id uuid,
 metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
create index if not exists orders_customer_created_idx on public.orders(customer_id,created_at desc);
create index if not exists orders_status_created_idx on public.orders(status,created_at desc);
create index if not exists payments_order_idx on public.payments(order_id);
create index if not exists menu_category_available_idx on public.menu_items(category_id,is_available);
create index if not exists inventory_item_created_idx on public.inventory_movements(menu_item_id,created_at desc);
create index if not exists audit_created_idx on public.audit_logs(created_at desc);

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into public.profiles(id,full_name,role) values(new.id,coalesce(new.raw_user_meta_data->>'full_name',''),'customer')
 on conflict(id) do nothing;
 return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

-- Atomic order creation: validate current server prices/availability and decrement stock under row locks.
create or replace function public.create_customer_order(
 p_customer_id uuid,p_items jsonb,p_payment_method text,p_order_email text,p_notes text,p_idempotency_key text
) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_order_id uuid; v_order_no text; v_subtotal numeric(12,2):=0; v_item jsonb; v_menu public.menu_items%rowtype; v_qty int; v_line numeric(12,2); v_token text; v_result jsonb;
begin
 if p_payment_method not in ('counter','razorpay') then raise exception 'INVALID_PAYMENT_METHOD'; end if;
 select id into v_order_id from public.orders where customer_id=p_customer_id and idempotency_key=p_idempotency_key;
 if v_order_id is not null then
   select jsonb_build_object('order',to_jsonb(o),'qrToken',null) into v_result from public.orders o where o.id=v_order_id;
   return v_result;
 end if;
 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 then raise exception 'EMPTY_CART'; end if;
 -- Lock items in stable order to reduce deadlock risk.
 for v_item in
   select jsonb_build_object('menu_item_id',value->>'menu_item_id','quantity',sum((value->>'quantity')::int)) as value
   from jsonb_array_elements(p_items) group by value->>'menu_item_id' order by value->>'menu_item_id'
 loop
   v_qty:=(v_item->>'quantity')::int;
   if v_qty<1 or v_qty>20 then raise exception 'INVALID_QUANTITY'; end if;
   select * into v_menu from public.menu_items where id=(v_item->>'menu_item_id')::uuid for update;
   if not found or not v_menu.is_available then raise exception 'ITEM_UNAVAILABLE'; end if;
   if v_menu.stock_quantity<v_qty then raise exception 'OUT_OF_STOCK'; end if;
   v_subtotal:=v_subtotal+(v_menu.price*v_qty);
 end loop;
 v_order_no:='PK-'||to_char(now(),'YYMMDD')||'-'||upper(substr(encode(gen_random_bytes(6),'hex'),1,8));
 insert into public.orders(order_number,customer_id,order_email,status,payment_status,payment_method,subtotal,total_amount,notes,idempotency_key)
 values(v_order_no,p_customer_id,p_order_email,'pending','pending',p_payment_method,v_subtotal,v_subtotal,p_notes,p_idempotency_key)
 returning id into v_order_id;
 for v_item in
   select jsonb_build_object('menu_item_id',value->>'menu_item_id','quantity',sum((value->>'quantity')::int)) as value
   from jsonb_array_elements(p_items) group by value->>'menu_item_id' order by value->>'menu_item_id'
 loop
   v_qty:=(v_item->>'quantity')::int;
   select * into v_menu from public.menu_items where id=(v_item->>'menu_item_id')::uuid for update;
   update public.menu_items set stock_quantity=stock_quantity-v_qty,updated_at=now() where id=v_menu.id;
   v_line:=v_menu.price*v_qty;
   insert into public.order_items(order_id,menu_item_id,item_name,unit_price,quantity,line_total) values(v_order_id,v_menu.id,v_menu.name,v_menu.price,v_qty,v_line);
   insert into public.inventory_movements(menu_item_id,order_id,actor_id,quantity_delta,reason) values(v_menu.id,v_order_id,p_customer_id,-v_qty,'order_reserved');
 end loop;
 v_token:=encode(gen_random_bytes(32),'hex');
 insert into public.order_qr_tokens(order_id,token_hash) values(v_order_id,encode(digest(v_token,'sha256'),'hex'));
 insert into public.order_status_history(order_id,new_status,note) values(v_order_id,'pending','Order created');
 insert into public.payments(order_id,customer_id,provider,status,amount,currency) values(v_order_id,p_customer_id,p_payment_method,'pending',v_subtotal,'INR');
 select jsonb_build_object('order',to_jsonb(o),'items',(select coalesce(jsonb_agg(to_jsonb(oi)),'[]'::jsonb) from public.order_items oi where oi.order_id=o.id),'qrToken',v_token) into v_result from public.orders o where o.id=v_order_id;
 return v_result;
end $$;

create or replace function public.mark_payment_paid(p_provider_order_id text,p_provider_payment_id text,p_payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_payment public.payments%rowtype; v_order public.orders%rowtype;
begin
 select * into v_payment from public.payments where provider_order_id=p_provider_order_id for update;
 if not found then raise exception 'PAYMENT_NOT_FOUND'; end if;
 select * into v_order from public.orders where id=v_payment.order_id for update;
 if v_order.payment_status='paid' then return jsonb_build_object('orderId',v_order.id,'paymentStatus','paid','idempotent',true); end if;
 update public.payments set status='paid',provider_payment_id=p_provider_payment_id,provider_payload=p_payload,updated_at=now() where id=v_payment.id;
 update public.orders set payment_status='paid',status=case when status='pending' then 'confirmed'::public.order_status else status end,updated_at=now() where id=v_order.id;
 insert into public.order_status_history(order_id,old_status,new_status,note) values(v_order.id,v_order.status,case when v_order.status='pending' then 'confirmed'::public.order_status else v_order.status end,'Verified payment received');
 return jsonb_build_object('orderId',v_order.id,'paymentStatus','paid','idempotent',false);
end $$;

create or replace function public.mark_payment_failed(p_provider_order_id text,p_provider_payment_id text,p_payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_payment public.payments%rowtype; v_order public.orders%rowtype; v_item record;
begin
 select * into v_payment from public.payments where provider_order_id=p_provider_order_id for update;
 if not found then return jsonb_build_object('ignored',true); end if;
 select * into v_order from public.orders where id=v_payment.order_id for update;
 if v_order.payment_status in ('paid','refunded') then return jsonb_build_object('ignored',true); end if;
 update public.payments set status='failed',provider_payment_id=coalesce(p_provider_payment_id,provider_payment_id),provider_payload=p_payload,updated_at=now() where id=v_payment.id;
 update public.orders set payment_status='failed',status='cancelled',stock_released=true,updated_at=now() where id=v_order.id and stock_released=false;
 if found then
  for v_item in select menu_item_id,quantity from public.order_items where order_id=v_order.id and menu_item_id is not null loop
   update public.menu_items set stock_quantity=stock_quantity+v_item.quantity,updated_at=now() where id=v_item.menu_item_id;
   insert into public.inventory_movements(menu_item_id,order_id,quantity_delta,reason) values(v_item.menu_item_id,v_order.id,v_item.quantity,'failed_payment_release');
  end loop;
 end if;
 return jsonb_build_object('orderId',v_order.id,'paymentStatus','failed');
end $$;

create or replace function public.record_counter_payment(p_order_id uuid,p_staff_id uuid,p_reference text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_order public.orders%rowtype; v_role public.app_role;
begin
 select role into v_role from public.profiles where id=p_staff_id;
 if v_role not in ('owner','admin','staff') then raise exception 'FORBIDDEN'; end if;
 select * into v_order from public.orders where id=p_order_id for update;
 if not found then raise exception 'ORDER_NOT_FOUND'; end if;
 if v_order.payment_method<>'counter' then raise exception 'NOT_COUNTER_ORDER'; end if;
 if v_order.payment_status='paid' then return jsonb_build_object('orderId',v_order.id,'paymentStatus','paid','idempotent',true); end if;
 update public.orders set payment_status='paid',updated_at=now() where id=p_order_id;
 update public.payments set status='paid',provider_payload=jsonb_build_object('staff_id',p_staff_id,'reference',p_reference),updated_at=now() where order_id=p_order_id and provider='counter';
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata) values(p_staff_id,'counter_payment_recorded','order',p_order_id,jsonb_build_object('reference',p_reference));
 return jsonb_build_object('orderId',v_order.id,'paymentStatus','paid');
end $$;

create or replace function public.admin_change_order_status(p_order_id uuid,p_actor_id uuid,p_status public.order_status)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_order public.orders%rowtype; v_role public.app_role;
begin
 select role into v_role from public.profiles where id=p_actor_id;
 if v_role not in ('owner','admin','staff') then raise exception 'FORBIDDEN'; end if;
 select * into v_order from public.orders where id=p_order_id for update;
 if not found then raise exception 'ORDER_NOT_FOUND'; end if;
 if v_order.status in ('completed','cancelled') then raise exception 'TERMINAL_ORDER'; end if;
 if p_status='completed' and v_order.payment_status<>'paid' then raise exception 'UNPAID_ORDER'; end if;
 if p_status='cancelled' and v_order.payment_status='paid' then raise exception 'PAID_ORDER_REFUND_REQUIRED'; end if;
 update public.orders set status=p_status,stock_released=case when p_status='cancelled' then true else stock_released end,updated_at=now() where id=p_order_id;
 if p_status='cancelled' and not v_order.stock_released then
  update public.menu_items m set stock_quantity=m.stock_quantity+oi.quantity,updated_at=now() from public.order_items oi where oi.order_id=p_order_id and oi.menu_item_id=m.id;
  insert into public.inventory_movements(menu_item_id,order_id,actor_id,quantity_delta,reason)
   select oi.menu_item_id,p_order_id,p_actor_id,oi.quantity,'order_cancelled_release' from public.order_items oi where oi.order_id=p_order_id and oi.menu_item_id is not null;
 end if;
 insert into public.order_status_history(order_id,actor_id,old_status,new_status) values(p_order_id,p_actor_id,v_order.status,p_status);
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata) values(p_actor_id,'order_status_changed','order',p_order_id,jsonb_build_object('from',v_order.status,'to',p_status));
 return jsonb_build_object('orderId',p_order_id,'status',p_status);
end $$;



create or replace function public.collect_order_by_qr(p_order_id uuid,p_staff_id uuid,p_token text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_order public.orders%rowtype; v_qr public.order_qr_tokens%rowtype; v_role public.app_role;
begin
 select role into v_role from public.profiles where id=p_staff_id;
 if v_role not in ('owner','admin','staff') then raise exception 'FORBIDDEN'; end if;
 select * into v_qr from public.order_qr_tokens where order_id=p_order_id for update;
 if not found or v_qr.revoked_at is not null or v_qr.expires_at<now() or v_qr.token_hash<>encode(digest(p_token,'sha256'),'hex') then raise exception 'INVALID_QR'; end if;
 if v_qr.collected_at is not null then raise exception 'QR_ALREADY_USED'; end if;
 select * into v_order from public.orders where id=p_order_id for update;
 if not found or v_order.status<>'ready_for_pickup' or v_order.payment_status<>'paid' then raise exception 'ORDER_NOT_READY_OR_UNPAID'; end if;
 update public.order_qr_tokens set collected_at=now(),collected_by=p_staff_id,revoked_at=now() where id=v_qr.id;
 update public.orders set status='completed',updated_at=now() where id=p_order_id;
 insert into public.order_status_history(order_id,actor_id,old_status,new_status,note) values(p_order_id,p_staff_id,v_order.status,'completed','Collected after QR verification');
 insert into public.audit_logs(actor_id,action,entity_type,entity_id) values(p_staff_id,'order_collected_by_qr','order',p_order_id);
 return jsonb_build_object('orderId',p_order_id,'status','completed','collectedAt',now());
end $$;
\n-- RPC execution is restricted to backend service-role calls. Never expose the service role key to browsers.
revoke all on function public.create_customer_order(uuid,jsonb,text,text,text,text) from public,anon,authenticated;
revoke all on function public.mark_payment_paid(text,text,jsonb) from public,anon,authenticated;
revoke all on function public.mark_payment_failed(text,text,jsonb) from public,anon,authenticated;
revoke all on function public.record_counter_payment(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.admin_change_order_status(uuid,uuid,public.order_status) from public,anon,authenticated;\nrevoke all on function public.collect_order_by_qr(uuid,uuid,text) from public,anon,authenticated;

grant execute on function public.create_customer_order(uuid,jsonb,text,text,text,text) to service_role;
grant execute on function public.mark_payment_paid(text,text,jsonb) to service_role;
grant execute on function public.mark_payment_failed(text,text,jsonb) to service_role;
grant execute on function public.record_counter_payment(uuid,uuid,text) to service_role;
grant execute on function public.admin_change_order_status(uuid,uuid,public.order_status) to service_role;
grant execute on function public.collect_order_by_qr(uuid,uuid,text) to service_role;
