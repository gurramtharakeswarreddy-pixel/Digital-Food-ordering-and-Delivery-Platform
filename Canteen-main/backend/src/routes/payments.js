import {Router} from 'express';
import crypto from 'node:crypto';
import Razorpay from 'razorpay';
import {z} from 'zod';
import {env} from '../config/env.js';
import {verifyRazorpaySignature,verifyWebhookSignature} from '../utils/payment-signature.js';
import {supabaseAdmin} from '../config/supabase.js';
import {requireAuth,requireAdmin} from '../middleware/auth.js';
import {asyncRoute,ok,HttpError} from '../utils/http.js';
export const paymentsRouter=Router();
const razorpay=()=>{if(!env.RAZORPAY_KEY_ID||!env.RAZORPAY_KEY_SECRET) throw new HttpError(503,'Online payments are not configured.');return new Razorpay({key_id:env.RAZORPAY_KEY_ID,key_secret:env.RAZORPAY_KEY_SECRET});};
paymentsRouter.post('/razorpay/order',requireAuth,asyncRoute(async(req,res)=>{
 const {orderId}=z.object({orderId:z.string().uuid()}).parse(req.body);
 const {data:order,error}=await supabaseAdmin.from('orders').select('id,customer_id,total_amount,currency,payment_status,status,order_number').eq('id',orderId).maybeSingle();
 if(error||!order) throw new HttpError(404,'Order not found.');
 if(order.customer_id!==req.user.id) throw new HttpError(403,'You cannot pay for this order.');
 if(order.payment_status!=='pending'||order.status==='cancelled') throw new HttpError(409,'This order is not awaiting payment.');
 const rp=razorpay();
 const amount=Math.round(Number(order.total_amount)*100);
 if(!Number.isSafeInteger(amount)||amount<1) throw new HttpError(400,'Invalid order total.');
 const rpOrder=await rp.orders.create({amount,currency:order.currency||'INR',receipt:order.order_number,notes:{internal_order_id:order.id}});
 const {error:insertError}=await supabaseAdmin.from('payments').insert({order_id:order.id,customer_id:req.user.id,provider:'razorpay',provider_order_id:rpOrder.id,status:'pending',amount:order.total_amount,currency:order.currency||'INR'});
 if(insertError) throw new HttpError(500,'Could not initialize payment.');
 ok(res,{keyId:env.RAZORPAY_KEY_ID,razorpayOrderId:rpOrder.id,amount:rpOrder.amount,currency:rpOrder.currency,orderId:order.id});
}));
paymentsRouter.post('/razorpay/verify',requireAuth,asyncRoute(async(req,res)=>{
 const b=z.object({razorpay_order_id:z.string(),razorpay_payment_id:z.string(),razorpay_signature:z.string(),orderId:z.string().uuid()}).parse(req.body);
 const {data:order,error}=await supabaseAdmin.from('orders').select('id,customer_id,payment_status').eq('id',b.orderId).maybeSingle();
 if(error||!order||order.customer_id!==req.user.id) throw new HttpError(404,'Order not found.');
 if(!verifyRazorpaySignature(b.razorpay_order_id,b.razorpay_payment_id,b.razorpay_signature,env.RAZORPAY_KEY_SECRET)) throw new HttpError(400,'Payment signature verification failed.','PAYMENT_SIGNATURE_INVALID');
 const {data:payment,error:pe}=await supabaseAdmin.from('payments').select('id,provider_order_id,status').eq('order_id',b.orderId).eq('provider_order_id',b.razorpay_order_id).maybeSingle();
 if(pe||!payment) throw new HttpError(404,'Payment attempt not found.');
 // A valid signature proves callback integrity; retrieve provider status before marking paid.
 const providerPayment=await razorpay().payments.fetch(b.razorpay_payment_id);
 if(providerPayment.order_id!==b.razorpay_order_id||providerPayment.status!=='captured') throw new HttpError(409,'Payment is not captured yet. Please wait for confirmation.');
 const {data:result,error:rpcError}=await supabaseAdmin.rpc('mark_payment_paid',{p_provider_order_id:b.razorpay_order_id,p_provider_payment_id:b.razorpay_payment_id,p_payload:{source:'checkout_verify'}});
 if(rpcError) throw new HttpError(500,'Payment was verified but order update needs reconciliation. Contact support with your order number.');
 ok(res,result);
}));
export async function razorpayWebhook(req,res,next){
 try{
  if(!env.RAZORPAY_WEBHOOK_SECRET) return res.status(503).json({ok:false,error:{message:'Webhook is not configured.'}});
  const signature=req.headers['x-razorpay-signature'];
  if(!verifyWebhookSignature(req.body,signature,env.RAZORPAY_WEBHOOK_SECRET)) return res.status(400).json({ok:false,error:{message:'Invalid webhook signature.'}});
  const event=JSON.parse(req.body.toString('utf8'));
  const entity=event.payload?.payment?.entity;
  if(entity?.order_id && ['payment.captured','order.paid'].includes(event.event)){
   const {error}=await supabaseAdmin.rpc('mark_payment_paid',{p_provider_order_id:entity.order_id,p_provider_payment_id:entity.id,p_payload:{event:event.event,event_id:event.id}});
   if(error) throw new Error('Payment webhook reconciliation failed');
  } else if(entity?.order_id && ['payment.failed'].includes(event.event)){
   await supabaseAdmin.rpc('mark_payment_failed',{p_provider_order_id:entity.order_id,p_provider_payment_id:entity.id,p_payload:{event:event.event,event_id:event.id}});
  }
  res.json({ok:true});
 }catch(e){next(e);}
}
