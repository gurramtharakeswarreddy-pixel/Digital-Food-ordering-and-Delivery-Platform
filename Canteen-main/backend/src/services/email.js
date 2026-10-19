import {Resend} from 'resend';
import {env} from '../config/env.js';
import {supabaseAdmin} from '../config/supabase.js';
import {buildReceipt} from './receipt.js';
export async function sendOrderConfirmation(order,qrToken){
 if(!env.EMAIL_PROVIDER_API_KEY||!env.EMAIL_FROM) return {sent:false,reason:'EMAIL_NOT_CONFIGURED'};
 const {data:items}=await supabaseAdmin.from('order_items').select('*').eq('order_id',order.id);
 const complete={...order,order_items:items||[]};
 const pdf=await buildReceipt(complete,qrToken);
 const resend=new Resend(env.EMAIL_PROVIDER_API_KEY);
 const lines=(items||[]).map(i=>`${i.item_name} × ${i.quantity} — ₹${Number(i.line_total).toFixed(2)}`).join('\n');
 const result=await resend.emails.send({from:env.EMAIL_FROM,to:[order.order_email],subject:`Order ${order.order_number} — The Panesh Kitchen`,
  text:`Thank you for ordering from The Panesh Kitchen.\nOrder: ${order.order_number}\nStatus: ${order.status}\nPayment: ${order.payment_status}\n\n${lines}\n\nTotal: ₹${Number(order.total_amount).toFixed(2)}`,
  attachments:[{filename:`${order.order_number}-receipt.pdf`,content:pdf.toString('base64')}]});
 const failed=!!result.error;
 await supabaseAdmin.from('email_delivery_logs').insert({order_id:order.id,recipient:order.order_email,provider:'resend',provider_message_id:result.data?.id||null,status:failed?'failed':'sent',attempts:1,last_error:failed?String(result.error.message||'Provider error').slice(0,500):null});
 if(failed) return {sent:false,reason:'PROVIDER_ERROR'};
 return {sent:true,messageId:result.data?.id};
}
