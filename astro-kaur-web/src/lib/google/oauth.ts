import 'server-only';
import {createCipheriv,createDecipheriv,randomBytes,timingSafeEqual} from 'node:crypto';
import {BookingError,siteUrl} from '@/lib/booking/server';
export const GOOGLE_SCOPES=[
  'https://www.googleapis.com/auth/calendar.freebusy',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
] as const;
export type GooglePurpose='account'|'organizer';
export interface GoogleTokenResponse {access_token:string;refresh_token?:string;expires_in:number;scope?:string}
function encryptionKey(){
  const encoded=process.env.GOOGLE_TOKEN_ENCRYPTION_KEY || '';
  const bytes=Buffer.from(encoded,'base64');
  if(!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded) || bytes.length!==32 || bytes.toString('base64')!==encoded) throw new BookingError('Google token encryption needs a 32-byte Base64 key.',503);
  return bytes;
}
export function encryptGoogleToken(token:string,userId:string){
  const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',encryptionKey(),iv);
  cipher.setAAD(Buffer.from(`theastrokaur:google:${userId}`));
  const body=Buffer.concat([cipher.update(token,'utf8'),cipher.final()]);
  return 'g1.'+Buffer.concat([iv,cipher.getAuthTag(),body]).toString('base64');
}
export function decryptGoogleToken(token:string,userId:string){
  try{
    if(!token.startsWith('g1.'))throw new Error('Unsupported ciphertext');
    const bytes=Buffer.from(token.slice(3),'base64');if(bytes.length<29)throw new Error('Invalid ciphertext');
    const decipher=createDecipheriv('aes-256-gcm',encryptionKey(),bytes.subarray(0,12));
    decipher.setAAD(Buffer.from(`theastrokaur:google:${userId}`));decipher.setAuthTag(bytes.subarray(12,28));
    return Buffer.concat([decipher.update(bytes.subarray(28)),decipher.final()]).toString('utf8');
  }catch{throw new BookingError('Google credentials could not be decrypted. Reconnect using the configured encryption key.',503);}
}
export function oauthConfig(){
  const client_id=process.env.GOOGLE_CLIENT_ID,client_secret=process.env.GOOGLE_CLIENT_SECRET;
  if(!client_id || !client_secret)throw new BookingError('Google OAuth is not configured yet.',503);
  encryptionKey();
  const expected=`${siteUrl()}/api/google/callback`,configured=process.env.GOOGLE_REDIRECT_URI || expected;
  if(configured!==expected)throw new BookingError('GOOGLE_REDIRECT_URI must match this environment’s site URL and /api/google/callback exactly.',503);
  return {client_id,client_secret,redirect_uri:configured};
}
export function newOAuthState(userId:string,purpose:GooglePurpose){
  const state=randomBytes(32).toString('hex');
  return {state,cookie:Buffer.from(JSON.stringify({state,userId,purpose})).toString('base64url')};
}
export function verifyOAuthState(cookie:string|undefined,state:string|null,userId:string):GooglePurpose{
  try{
    if(!cookie || !state || !/^[a-f0-9]{64}$/.test(state))throw new Error('Invalid state');
    const saved=JSON.parse(Buffer.from(cookie,'base64url').toString('utf8')) as {state:string;userId:string;purpose:string};
    if(saved.userId!==userId || !['account','organizer'].includes(saved.purpose) || typeof saved.state!=='string')throw new Error('Invalid binding');
    const actual=Buffer.from(state),expected=Buffer.from(saved.state);
    if(actual.length!==expected.length || !timingSafeEqual(actual,expected))throw new Error('Mismatch');
    return saved.purpose as GooglePurpose;
  }catch{throw new BookingError('Google connection expired or belongs to a different login. Start Connect again.',400);}
}
export function grantedScopes(scope:string|undefined){
  const granted=(scope || '').split(/\s+/).filter(Boolean);
  if(!GOOGLE_SCOPES.every(s=>granted.includes(s)))throw new BookingError('Grant all three requested Calendar permissions, then reconnect.',403);
  return granted;
}
export async function exchangeToken(params:Record<string,string>):Promise<GoogleTokenResponse>{
  const {client_id,client_secret,redirect_uri}=oauthConfig();
  const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id,client_secret,...(params.grant_type==='authorization_code'?{redirect_uri}:{}),...params}),signal:AbortSignal.timeout(12000),cache:'no-store'});
  if(!response.ok){
    const body=await response.json().catch(()=>({})) as {error?:string};
    if(body.error==='invalid_grant')throw new BookingError('Google access expired or was revoked. Reconnect your calendar.',401);
    throw new BookingError('Google authorization is temporarily unavailable. Check OAuth configuration or try again shortly.',503);
  }
  const data=await response.json() as GoogleTokenResponse;
  if(!data.access_token || !Number.isFinite(data.expires_in) || data.expires_in<=0)throw new BookingError('Google returned an incomplete authorization response.',503);
  return data;
}
export async function revokeToken(token:string){
  const response=await fetch('https://oauth2.googleapis.com/revoke',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({token}),signal:AbortSignal.timeout(12000),cache:'no-store'});
  if(response.ok)return true;
  const body=await response.json().catch(()=>({})) as {error?:string};
  return response.status===400 && body.error==='invalid_token';
}
