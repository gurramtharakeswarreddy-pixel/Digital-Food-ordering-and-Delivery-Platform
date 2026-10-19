import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import {env} from '../config/env.js';
export async function buildReceipt(order,qrToken){
 const qr=await QRCode.toDataURL(`${env.APP_BASE_URL.replace(/\/$/,'')}/order-confirmation.html?order=${encodeURIComponent(order.id)}&token=${encodeURIComponent(qrToken)}`,{errorCorrectionLevel:'M',margin:1,width:220});
 return new Promise((resolve,reject)=>{
  const doc=new PDFDocument({size:'A4',margin:48,info:{Title:`Receipt ${order.order_number}`,Author:'The Panesh Kitchen'}});
  const chunks=[];doc.on('data',c=>chunks.push(c));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);
  doc.fontSize(22).fillColor('#2563EB').text('The Panesh Kitchen',{align:'center'});
  doc.moveDown(.3).fontSize(10).fillColor('#555').text('Authentic Indian Taste',{align:'center'});
  doc.moveDown().strokeColor('#06B6D4').moveTo(48,doc.y).lineTo(547,doc.y).stroke();doc.moveDown();
  doc.fillColor('#111').fontSize(18).text('ORDER RECEIPT');
  doc.moveDown(.4).fontSize(10).text(`Order: ${order.order_number}`).text(`Date: ${new Date(order.created_at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})}`).text(`Status: ${order.status}`).text(`Payment: ${order.payment_method} / ${order.payment_status}`).text(`Email: ${order.order_email}`);
  doc.moveDown().fontSize(11).fillColor('#111').text('Items',{underline:true});
  for(const item of (order.order_items||[])){
   doc.moveDown(.4).fontSize(10).text(`${item.item_name}  × ${item.quantity}`,{continued:true}).text(`₹${Number(item.line_total).toFixed(2)}`,{align:'right'});
  }
  doc.moveDown().strokeColor('#ddd').moveTo(48,doc.y).lineTo(547,doc.y).stroke();doc.moveDown(.6);
  doc.fontSize(10).text(`Subtotal: ₹${Number(order.subtotal).toFixed(2)}`,{align:'right'});
  doc.text(`Discount: ₹${Number(order.discount_amount||0).toFixed(2)}`,{align:'right'});
  doc.text(`Tax: ₹${Number(order.tax_amount||0).toFixed(2)}`,{align:'right'});
  doc.moveDown(.3).fontSize(15).fillColor('#2563EB').text(`Total: ₹${Number(order.total_amount).toFixed(2)}`,{align:'right'});
  doc.moveDown(1).fontSize(10).fillColor('#555').text('Scan this QR code to verify the order. Staff authorization is required for collection and counter-payment actions.',{align:'center'});
  const raw=Buffer.from(qr.split(',')[1],'base64');doc.image(raw,doc.page.width/2-70,doc.y+8,{width:140});
  doc.end();
 });
}
