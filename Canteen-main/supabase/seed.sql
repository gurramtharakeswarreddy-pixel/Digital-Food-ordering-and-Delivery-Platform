-- OPTIONAL DEVELOPMENT SEED ONLY. Review before running; do not blindly run in production.
insert into public.categories(name,description,sort_order) values
 ('Starters','Snacks and starters',1),('Main Course','Meals and main dishes',2),('Drinks','Cold and hot beverages',3),('Desserts','Sweet dishes',4)
on conflict(name) do nothing;
insert into public.menu_items(category_id,name,description,price,is_vegetarian,is_available,stock_quantity,low_stock_threshold)
select c.id,v.name,v.description,v.price,true,true,30,5
from (values
 ('Masala Dosa','Crispy dosa with potato masala',80.00,'Main Course'),
 ('Paneer Fried Rice','Rice tossed with paneer and vegetables',140.00,'Main Course'),
 ('Samosa','Crispy potato-filled snack',25.00,'Starters'),
 ('Lime Soda','Fresh lime soda',40.00,'Drinks'),
 ('Gulab Jamun','Classic Indian dessert',50.00,'Desserts')
) v(name,description,price,category_name)
join public.categories c on c.name=v.category_name
where not exists(select 1 from public.menu_items m where m.name=v.name);
