export class HttpError extends Error {
 constructor(status,message,code='REQUEST_FAILED'){super(message);this.status=status;this.code=code;}
}
export const ok=(res,data,status=200)=>res.status(status).json({ok:true,data});
export const asyncRoute=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
