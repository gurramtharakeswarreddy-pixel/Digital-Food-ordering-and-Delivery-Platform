import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {verifyRazorpaySignature,verifyWebhookSignature} from '../src/utils/payment-signature.js';

test('Razorpay payment signature accepts a valid HMAC',()=>{
 const secret='test_secret',order='order_test_123',payment='pay_test_123';
 const sig=crypto.createHmac('sha256',secret).update(`${order}|${payment}`).digest('hex');
 assert.equal(verifyRazorpaySignature(order,payment,sig,secret),true);
});
test('Razorpay payment signature rejects invalid/missing inputs',()=>{
 assert.equal(verifyRazorpaySignature('order','payment','bad','secret'),false);
 assert.equal(verifyRazorpaySignature('order','payment','','secret'),false);
});
test('webhook signature verifies the exact raw bytes',()=>{
 const secret='webhook_secret',raw=Buffer.from('{"event":"payment.captured"}');
 const sig=crypto.createHmac('sha256',secret).update(raw).digest('hex');
 assert.equal(verifyWebhookSignature(raw,sig,secret),true);
 assert.equal(verifyWebhookSignature(Buffer.from('{"event":"payment.failed"}'),sig,secret),false);
});
