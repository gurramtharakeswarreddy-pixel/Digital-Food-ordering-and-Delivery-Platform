/* Small fetch client shared by the preserved static HTML pages. */
(() => {
 const config=window.PANESH_CONFIG||{};
 const base=String(config.API_BASE_URL||'').replace(/\/$/,'');
 async function request(path,{method='GET',body,token,headers={}}={}){
  if(!base) throw new Error('API_BASE_URL is not configured.');
  const response=await fetch(`${base}${path}`,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`} :{}),...headers},...(body?{body:JSON.stringify(body)}:{})});
  const json=await response.json().catch(()=>({ok:false,error:{message:'Invalid server response'}}));
  if(!response.ok||!json.ok){const e=new Error(json.error?.message||`Request failed (${response.status})`);e.status=response.status;e.code=json.error?.code;throw e;}
  return json.data;
 }
 window.PaneshAPI=Object.freeze({
  request,
  menu:(params={})=>{const q=new URLSearchParams(params);return request(`/menu${q.size?'?'+q:''}`);},
  categories:()=>request('/menu/categories'),
  createOrder:(body,token)=>request('/orders',{method:'POST',body,token,headers:{'Idempotency-Key':body.idempotencyKey||crypto.randomUUID()}}),
  myOrders:token=>request('/orders/mine',{token}),
  order:(id,token)=>request(`/orders/${encodeURIComponent(id)}`,{token}),
  createRazorpayOrder:(orderId,token)=>request('/payments/razorpay/order',{method:'POST',body:{orderId},token}),
  verifyRazorpay:(body,token)=>request('/payments/razorpay/verify',{method:'POST',body,token})
 });
})();
