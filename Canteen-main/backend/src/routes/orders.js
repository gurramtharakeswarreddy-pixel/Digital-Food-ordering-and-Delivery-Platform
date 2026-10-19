import {Router} from 'express';
import {z} from 'zod';
import crypto from 'node:crypto';
import {supabaseAdmin} from '../config/supabase.js';
import {requireAuth,requireAdmin} from '../middleware/auth.js';
import {asyncRoute,ok,HttpError} from '../utils/http.js';
import {buildReceipt} from '../services/receipt.js';
import {sendOrderConfirmation} from '../services/email.js';
export const ordersRouter=Router();
const orderSchema=z.object({
 items:z.array(z.object({menuItemId:z.string().uuid(),quantity:z.number().int().min(1).max(20)})).min(1).max(50),
 paymentMethod:z.enum(['counter','razorpay']),
 orderEmail:z.string().email().max(254),
 idempotencyKey:z.string().min(12).max(100).optional(),
 notes:z.string().max(500).optional()
});
ordersRouter.use(requireAuth);
ordersRouter.post('/',asyncRoute(async(req,res)=>{
 const input=orderSchema.parse(req.body);
 if(input.orderEmail.toLowerCase()!==String(req.user.email||'').toLowerCase() && !req.body.confirmAlternateEmail)
  throw new HttpError(400,'Confirm the alternate order email before continuing.','EMAIL_CONFIRMATION_REQUIRED');
 const {data,error}=await supabaseAdmin.rpc('create_customer_order',{
  p_customer_id:req.user.id,p_items:input.items.map(i=>({menu_item_id:i.menuItemId,quantity:i.quantity})),
  p_payment_method:input.paymentMethod,p_order_email:input.orderEmail,p_notes:input.notes||null,
  p_idempotency_key:input.idempotencyKey||crypto.randomUUID()
 });
 if(error){if(error.message?.includes('OUT_OF_STOCK')) throw new HttpError(409,'One or more items are no longer available in the requested quantity.','OUT_OF_STOCK'); if(error.message?.includes('ITEM_UNAVAILABLE')) throw new HttpError(409,'One or more menu items are unavailable.','ITEM_UNAVAILABLE'); console.error('create order RPC failed',error.code);throw new HttpError(400,'Unable to create this order. Please refresh the menu and try again.');}
 const payload=data;
 const createdOrder=payload?.order;
 let email={sent:false,reason:'ORDER_NOT_RETURNED'};
 if(createdOrder){try{email=await sendOrderConfirmation({...createdOrder,order_items:payload.items||[]},payload.qrToken);}catch(e){console.error('order email failed',String(e.message||e));email={sent:false,reason:'DELIVERY_FAILED'};}}
 ok(res,{...payload,email},201);
}));
ordersRouter.get('/mine',asyncRoute(async(req,res)=>{
 const {data,error}=await supabaseAdmin.from('orders').select('id,order_number,status,payment_status,payment_method,total_amount,currency,created_at,order_email').eq('customer_id',req.user.id).order('created_at',{ascending:false}).limit(100);
 if(error) throw new HttpError(503,'Order history is temporarily unavailable.');
 ok(res,data||[]);
}));
ordersRouter.get('/:id',asyncRoute(async(req,res)=>{
 const {data,error}=await supabaseAdmin.from('orders').select('*,order_items(*),payments(id,provider,status,amount,currency,created_at)').eq('id',req.params.id).maybeSingle();
 if(error) throw new HttpError(503,'Order lookup failed.');
 if(!data) throw new HttpError(404,'Order not found.');
 if(data.customer_id!==req.user.id && !['owner','admin','staff'].includes(req.profile?.role)) throw new HttpError(403,'You cannot access this order.');
 ok(res,data);
}));

ordersRouter.get('/:id/receipt',asyncRoute(async(req,res)=>{
 const {data:order,error}=await supabaseAdmin.from('orders').select('*,order_items(*)').eq('id',req.params.id).maybeSingle();
 if(error||!order) throw new HttpError(404,'Order not found.');
 if(order.customer_id!==req.user.id && !['owner','admin','staff'].includes(req.profile?.role)) throw new HttpError(403,'You cannot access this receipt.');
 const token=String(req.query.token||'');
 if(token.length<32||token.length>200) throw new HttpError(400,'A valid QR token is required to generate the receipt.');
 const hash=crypto.createHash('sha256').update(token).digest('hex');
 const {data:qr,error:qe}=await supabaseAdmin.from('order_qr_tokens').select('order_id,expires_at,revoked_at').eq('token_hash',hash).maybeSingle();
 if(qe||!qr||qr.order_id!==order.id||qr.revoked_at||new Date(qr.expires_at)<new Date()) throw new HttpError(403,'Invalid or expired receipt token.');
 const pdf=await buildReceipt(order,token);
 res.setHeader('Content-Type','application/pdf');res.setHeader('Content-Disposition',`attachment; filename="${order.order_number}-receipt.pdf"`);res.send(pdf);
}));
ordersRouter.get('/:id/verify-qr',asyncRoute(async(req,res)=>{
 const token=String(req.query.token||'');
 if(token.length<32||token.length>200) throw new HttpError(400,'Invalid QR token.');
 const hash=crypto.createHash('sha256').update(token).digest('hex');
 const {data,error}=await supabaseAdmin.from('order_qr_tokens').select('order_id,expires_at,revoked_at').eq('token_hash',hash).maybeSingle();
 if(error||!data||data.revoked_at||new Date(data.expires_at)<new Date()) throw new HttpError(404,'QR code is invalid or expired.');
 const {data:order,error:oe}=await supabaseAdmin.from('orders').select('id,order_number,status,payment_status,payment_method,created_at').eq('id',data.order_id).maybeSingle();
 if(oe||!order) throw new HttpError(404,'Order not found.');
 ok(res,{order,actionsRequireStaff:true});
}));
