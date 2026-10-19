import crypto from 'node:crypto';
export function verifyRazorpaySignature(orderId,paymentId,signature,secret){
 if(!orderId||!paymentId||!signature||!secret) return false;
 const expected=crypto.createHmac('sha256',secret).update(`${orderId}|${paymentId}`).digest('hex');
 const a=Buffer.from(expected,'utf8'),b=Buffer.from(String(signature),'utf8');
 return a.length===b.length&&crypto.timingSafeEqual(a,b);
}
export function verifyWebhookSignature(rawBody,signature,secret){
 if(!rawBody||!signature||!secret) return false;
 const expected=crypto.createHmac('sha256',secret).update(rawBody).digest('hex');
 const a=Buffer.from(expected,'utf8'),b=Buffer.from(String(signature),'utf8');
 return a.length===b.length&&crypto.timingSafeEqual(a,b);
}
