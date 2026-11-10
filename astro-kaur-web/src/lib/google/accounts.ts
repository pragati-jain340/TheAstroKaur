import 'server-only';
import {BookingError,check,database} from '@/lib/booking/server';
import {decryptGoogleToken,encryptGoogleToken,exchangeToken,grantedScopes,revokeToken,type GoogleTokenResponse} from './oauth';
export interface UserGoogleConnection{
  auth_user_id:string;google_primary_calendar_id:string;encrypted_refresh_token:string|null;encrypted_access_token:string|null;
  access_expires_at:string|null;granted_scopes:string[];token_version:string;status:string;connected_at:string;last_error:string|null;
}
export interface GoogleCalendar{id:string;summary:string;timeZone?:string;accessRole:string;primary?:boolean;conferenceProperties?:{allowedConferenceSolutionTypes?:string[]}}
export async function userConnection(userId:string):Promise<UserGoogleConnection|null>{
  return check(await database().from('google_user_connections').select('*').eq('auth_user_id',userId).maybeSingle()) as UserGoogleConnection|null;
}
export function publicConnection(connection:UserGoogleConnection|null){
  if(!connection)return null;
  return {account:connection.google_primary_calendar_id,status:connection.status,connected_at:connection.connected_at,last_error:connection.last_error};
}
async function markReconnect(connection:UserGoogleConnection,message:string){
  check(await database().from('google_user_connections').update({status:'reconnect_required',last_error:message,encrypted_access_token:null,access_expires_at:null}).eq('auth_user_id',connection.auth_user_id).eq('token_version',connection.token_version).eq('status','connected'));
}
export async function accessToken(userId:string,force=false):Promise<string>{
  const connection=await userConnection(userId);
  if(!connection || connection.status!=='connected' || !connection.encrypted_refresh_token)throw new BookingError('Connect or reconnect your Google Calendar to continue.',409);
  if(!force && connection.encrypted_access_token && Date.parse(connection.access_expires_at || '')>Date.now()+60000){
    try{return decryptGoogleToken(connection.encrypted_access_token,userId);}catch(error){await markReconnect(connection,'Google credentials could not be decrypted. Check the shared encryption key and reconnect.');throw error;}
  }
  let token:GoogleTokenResponse;
  try{token=await exchangeToken({grant_type:'refresh_token',refresh_token:decryptGoogleToken(connection.encrypted_refresh_token,userId)});}
  catch(error){if(error instanceof BookingError && (error.status===401 || error.message.includes('could not be decrypted')))await markReconnect(connection,'Google credentials expired, were revoked or could not be decrypted. Check configuration and reconnect.');throw error;}
  if(token.scope){try{grantedScopes(token.scope);}catch(error){await markReconnect(connection,'Google Calendar permissions changed. Grant all three permissions when reconnecting.');throw error;}}
  const updated=check(await database().from('google_user_connections').update({encrypted_access_token:encryptGoogleToken(token.access_token,userId),access_expires_at:new Date(Date.now()+token.expires_in*1000).toISOString(),...(token.refresh_token?{encrypted_refresh_token:encryptGoogleToken(token.refresh_token,userId)}:{}),last_error:null,updated_at:new Date().toISOString()}).eq('auth_user_id',userId).eq('token_version',connection.token_version).eq('status','connected').select('auth_user_id'));
  if(!updated?.length)throw new BookingError('Google connection changed during refresh. Please retry.',409);
  return token.access_token;
}
export async function googleRequest(userId:string,path:string,options:RequestInit={},token?:string){
  const send=(value:string)=>fetch(`https://www.googleapis.com/calendar/v3/${path}`,{...options,headers:{Authorization:`Bearer ${value}`,'Content-Type':'application/json',...options.headers},signal:AbortSignal.timeout(12000),cache:'no-store'});
  let response=await send(token || await accessToken(userId));
  if(response.status===401 && !token){response=await send(await accessToken(userId,true));}
  if(response.status===401){const connection=await userConnection(userId);if(connection)await markReconnect(connection,'Google access was revoked. Reconnect your calendar.');throw new BookingError('Google access was revoked. Reconnect your calendar.',401);}
  return response;
}
export async function primaryCalendar(token:string):Promise<{id:string}>{
  const response=await fetch('https://www.googleapis.com/calendar/v3/calendars/primary',{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(12000),cache:'no-store'});
  if(!response.ok)throw new BookingError('Google primary calendar could not be read. Grant the configured Calendar permissions.',403);
  const data=await response.json() as {id?:string};if(!data.id)throw new BookingError('Google did not identify the authorized calendar.',503);
  return {id:data.id};
}
export async function saveAuthorization(userId:string,token:GoogleTokenResponse,organizer:boolean){
  const scopes=grantedScopes(token.scope),primary=await primaryCalendar(token.access_token),old=await userConnection(userId);
  const refresh=token.refresh_token?encryptGoogleToken(token.refresh_token,userId):old?.google_primary_calendar_id===primary.id?old.encrypted_refresh_token:null;
  if(!refresh)throw new BookingError('Google did not provide offline access. Reconnect and approve Calendar access.',409);
  const result=await database().rpc('google_save_connection',{p_user:userId,p_primary:primary.id,p_refresh:refresh,p_access:encryptGoogleToken(token.access_token,userId),p_expires:new Date(Date.now()+token.expires_in*1000).toISOString(),p_scopes:scopes,p_organizer:organizer});
  if(result.error?.code==='23505')throw new BookingError('This Google account is already connected to a different website login.',409);
  check(result);
}
export async function accessibleCalendars(userId:string):Promise<GoogleCalendar[]>{
  const calendars:GoogleCalendar[]=[];let pageToken:string|undefined;
  do{
    const query=new URLSearchParams({maxResults:'250',...(pageToken?{pageToken}:{})});
    const response=await googleRequest(userId,`users/me/calendarList?${query}`);
    if(!response.ok)throw new BookingError('Google calendars could not be loaded. Check calendar permissions and reconnect if needed.',503);
    const page=await response.json() as {items?:GoogleCalendar[];nextPageToken?:string};calendars.push(...(page.items || []));pageToken=page.nextPageToken;
  }while(pageToken);
  return calendars.map(c=>({id:c.id,summary:c.summary || c.id,timeZone:c.timeZone,accessRole:c.accessRole,primary:c.primary,conferenceProperties:c.conferenceProperties}));
}
export async function validateCalendarSelection(userId:string,organizer:string,busy:string[]){
  if(busy.length>20 || !organizer || busy.some(id=>typeof id!=='string' || id.length>255))throw new BookingError('Choose at most 20 accessible conflict calendars.');
  const calendars=await accessibleCalendars(userId),primary=calendars.find(c=>c.primary);
  const normalize=(id:string)=>id==='primary'?primary?.id || id:id;
  const selected=calendars.find(c=>c.id===normalize(organizer));
  if(!selected || !['owner','writer'].includes(selected.accessRole))throw new BookingError('The organizer calendar needs owner or writer access.');
  if(!selected.conferenceProperties?.allowedConferenceSolutionTypes?.includes('hangoutsMeet'))throw new BookingError('This calendar does not support Google Meet. Choose a Meet-capable calendar.');
  const selectedBusy=[...new Set([selected.id,...busy.map(normalize)])];
  if(selectedBusy.some(id=>!calendars.some(c=>c.id===id)))throw new BookingError('A selected conflict calendar is not accessible to this Google account.');
  return {calendar:selected.id,busy:selectedBusy};
}
export function validateRange(start:unknown,end:unknown){
  if(typeof start!=='string' || typeof end!=='string' || !Number.isFinite(Date.parse(start)) || !Number.isFinite(Date.parse(end)) || Date.parse(end)<=Date.parse(start) || Date.parse(end)-Date.parse(start)>31*86400000)throw new BookingError('Choose a valid time range of at most 31 days.');
  return {start:new Date(start).toISOString(),end:new Date(end).toISOString()};
}
export async function disconnectGoogle(userId:string){
  const connection=await userConnection(userId);if(!connection || connection.status==='disconnected')return {disconnected:true,revoked:true};
  const began=check(await database().rpc('google_begin_disconnect',{p_user:userId,p_version:connection.token_version}));
  if(!began)throw new BookingError('Google connection changed. Please refresh and try again.',409);
  let revoked=false;
  try{if(connection.encrypted_refresh_token)revoked=await revokeToken(decryptGoogleToken(connection.encrypted_refresh_token,userId));}catch{/* Local disconnection is still enforced, even during a provider outage. */}
  check(await database().rpc('google_finish_disconnect',{p_user:userId,p_version:connection.token_version,p_revoked:revoked}));
  return {disconnected:true,revoked,warning:revoked?null:'Disconnected locally. Google revocation could not be confirmed; remove app access in your Google account.'};
}
