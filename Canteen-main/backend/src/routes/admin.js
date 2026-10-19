import {Router} from 'express';
import {z} from 'zod';
import {supabaseAdmin} from '../config/supabase.js';
import {requireAuth,requireAdmin,requireOwner} from '../middleware/auth.js';
import {asyncRoute,ok,HttpError} from '../utils/http.js';
export const adminRouter=Router();adminRouter.use(requireAuth,requireAdmin);
adminRouter.get('/dashboard',asyncRoute(async(req,res)=>{
 const [orders,items,payments]=await Promise.all([
  supabaseAdmin.from('orders').select('id,status,payment_status,total_amount,created_at,payment_method'),
  supabaseAdmin.from('menu_items').select('id,stock_quantity,low_stock_threshold,is_available'),
  supabaseAdmin.from('payments').select('id,status,amount')
 ]);
 if(orders.error||items.error||payments.error) throw new HttpError(503,'Dashboard metrics are temporarily unavailable.');
 const os=orders.data||[],ms=items.data||[],ps=payments.data||[];
 ok(res,{totalOrders:os.length,pendingOrders:os.filter(x=>x.status==='pending').length,preparingOrders:os.filter(x=>x.status==='preparing').length,lowStockItems:ms.filter(x=>x.is_available&&x.stock_quantity<=x.low_stock_threshold).length,verifiedPaidAmount:ps.filter(x=>x.status==='paid').reduce((s,x)=>s+Number(x.amount),0),pendingCounterAmount:os.filter(x=>x.payment_method==='counter'&&x.payment_status==='pending').reduce((s,x)=>s+Number(x.total_amount),0)});
}));
adminRouter.get('/orders',asyncRoute(async(req,res)=>{
 const page=Math.max(1,Number(req.query.page)||1),limit=Math.min(100,Math.max(1,Number(req.query.limit)||25));
 let q=supabaseAdmin.from('orders').select('id,order_number,customer_id,order_email,status,payment_status,payment_method,total_amount,currency,created_at', {count:'exact'}).order('created_at',{ascending:false}).range((page-1)*limit,page*limit-1);
 if(req.query.status) q=q.eq('status',String(req.query.status));
 if(req.query.paymentMethod) q=q.eq('payment_method',String(req.query.paymentMethod));
 const {data,error,count}=await q;if(error) throw new HttpError(503,'Orders are temporarily unavailable.');
 ok(res,{items:data||[],page,limit,total:count||0});
}));
adminRouter.patch('/orders/:id/status',asyncRoute(async(req,res)=>{
 const {status}=z.object({status:z.enum(['confirmed','preparing','ready_for_pickup','completed','cancelled'])}).parse(req.body);
 const {data:before,error:be}=await supabaseAdmin.from('orders').select('*').eq('id',req.params.id).maybeSingle();
 if(be||!before) throw new HttpError(404,'Order not found.');
 if(before.status==='completed'||before.status==='cancelled') throw new HttpError(409,'This order is already in a terminal state.');
 if(status==='completed' && before.payment_method==='counter' && before.payment_status!=='paid') throw new HttpError(409,'Record counter payment before completing this order.');
 const {data,error}=await supabaseAdmin.rpc('admin_change_order_status',{p_order_id:req.params.id,p_actor_id:req.user.id,p_status:status});
 if(error) throw new HttpError(409,'Order status could not be changed.');
 ok(res,data);
}));
adminRouter.post('/orders/:id/counter-payment',asyncRoute(async(req,res)=>{
 const {data,error}=await supabaseAdmin.rpc('record_counter_payment',{p_order_id:req.params.id,p_staff_id:req.user.id,p_reference:String(req.body?.reference||'').slice(0,100)||null});
 if(error) throw new HttpError(409,'Counter payment could not be recorded.');
 ok(res,data);
}));
adminRouter.get('/menu',asyncRoute(async(req,res)=>{
 const {data,error}=await supabaseAdmin.from('menu_items').select('*,categories(name)').order('name');
 if(error) throw new HttpError(503,'Menu administration is unavailable.');ok(res,data||[]);
}));
adminRouter.post('/menu',asyncRoute(async(req,res)=>{
 const b=z.object({category_id:z.string().uuid().nullable().optional(),name:z.string().min(2).max(120),description:z.string().max(1000).optional(),price:z.number().nonnegative().max(100000),image_url:z.string().url().nullable().optional(),is_vegetarian:z.boolean().default(true),is_available:z.boolean().default(true),stock_quantity:z.number().int().min(0).max(100000),low_stock_threshold:z.number().int().min(0).max(100000).default(5)}).parse(req.body);
 const {data,error}=await supabaseAdmin.from('menu_items').insert(b).select().single();
 if(error) throw new HttpError(400,'Menu item could not be created.');
 await supabaseAdmin.from('audit_logs').insert({actor_id:req.user.id,action:'menu_item_created',entity_type:'menu_item',entity_id:data.id,metadata:{name:data.name}});
 ok(res,data,201);
}));
adminRouter.patch('/menu/:id',asyncRoute(async(req,res)=>{
 const b=z.object({category_id:z.string().uuid().nullable().optional(),name:z.string().min(2).max(120).optional(),description:z.string().max(1000).optional(),price:z.number().nonnegative().max(100000).optional(),image_url:z.string().url().nullable().optional(),is_vegetarian:z.boolean().optional(),is_available:z.boolean().optional(),stock_quantity:z.number().int().min(0).max(100000).optional(),low_stock_threshold:z.number().int().min(0).max(100000).optional()}).refine(x=>Object.keys(x).length>0).parse(req.body);
 const {data,error}=await supabaseAdmin.from('menu_items').update({...b,updated_at:new Date().toISOString()}).eq('id',req.params.id).select().maybeSingle();
 if(error||!data) throw new HttpError(404,'Menu item not found or could not be updated.');
 await supabaseAdmin.from('audit_logs').insert({actor_id:req.user.id,action:'menu_item_updated',entity_type:'menu_item',entity_id:data.id,metadata:{fields:Object.keys(b)}});
 ok(res,data);
}));
adminRouter.get('/audit-logs',requireOwner,asyncRoute(async(req,res)=>{
 const {data,error}=await supabaseAdmin.from('audit_logs').select('id,actor_id,action,entity_type,entity_id,metadata,created_at').order('created_at',{ascending:false}).limit(200);
 if(error) throw new HttpError(503,'Audit logs are unavailable.');ok(res,data||[]);
}));

adminRouter.post('/orders/:id/collect',asyncRoute(async(req,res)=>{
 const token=String(req.body?.token||'');
 if(token.length<32||token.length>200) throw new HttpError(400,'Invalid QR token.');
 const {data,error}=await supabaseAdmin.rpc('collect_order_by_qr',{p_order_id:req.params.id,p_staff_id:req.user.id,p_token:token});
 if(error) throw new HttpError(409,'Order cannot be collected. Verify the QR code and current order status.');
 ok(res,data);
}));
