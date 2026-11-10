import test from 'node:test';
import assert from 'node:assert/strict';
import {encryptGoogleToken,decryptGoogleToken,GOOGLE_SCOPES,oauthConfig,newOAuthState,verifyOAuthState,grantedScopes,revokeToken} from '../src/lib/google/oauth';
import {accessToken,googleRequest,publicConnection,validateRange,type UserGoogleConnection} from '../src/lib/google/accounts';
import {syncEvent} from '../src/lib/google/calendar';
import type {BookingOrder} from '../src/lib/booking/types';
const user='11111111-1111-4111-8111-111111111111';
process.env.GOOGLE_TOKEN_ENCRYPTION_KEY=Buffer.alloc(32,7).toString('base64');
process.env.GOOGLE_CLIENT_ID='synthetic-client';process.env.GOOGLE_CLIENT_SECRET='synthetic-secret';
process.env.NEXT_PUBLIC_SITE_URL='http://localhost:3000';process.env.GOOGLE_REDIRECT_URI='http://localhost:3000/api/google/callback';
process.env.NEXT_PUBLIC_SUPABASE_URL='https://google-test.invalid';process.env.SUPABASE_SECRET_KEY='synthetic-database-secret';
test('AES-GCM ciphertext is authenticated, randomized and bound to the website user',()=>{
  const first=encryptGoogleToken('synthetic-refresh-token',user),second=encryptGoogleToken('synthetic-refresh-token',user);
  assert.notEqual(first,second);assert.ok(!first.includes('synthetic-refresh-token'));
  assert.equal(decryptGoogleToken(first,user),'synthetic-refresh-token');
  assert.throws(()=>decryptGoogleToken(first,'different-user'),/could not be decrypted/);
  const corrupted=Buffer.from(first.slice(3),'base64');corrupted[15]^=1;
  assert.throws(()=>decryptGoogleToken('g1.'+corrupted.toString('base64'),user),/could not be decrypted/);
});
test('OAuth uses the configured callback exactly and rejects environment mismatches',()=>{
  assert.equal(oauthConfig().redirect_uri,'http://localhost:3000/api/google/callback');
  process.env.GOOGLE_REDIRECT_URI='https://wrong.example/api/google/callback';
  assert.throws(()=>oauthConfig(),/must match/);
  delete process.env.GOOGLE_REDIRECT_URI;assert.equal(oauthConfig().redirect_uri,'http://localhost:3000/api/google/callback');
  process.env.GOOGLE_REDIRECT_URI='http://localhost:3000/api/google/callback';
});
test('OAuth state rejects the wrong nonce or authenticated login and remembers organizer purpose',()=>{
  const state=newOAuthState(user,'organizer');assert.equal(verifyOAuthState(state.cookie,state.state,user),'organizer');
  assert.throws(()=>verifyOAuthState(state.cookie,'0'.repeat(64),user),/different login/);
  assert.throws(()=>verifyOAuthState(state.cookie,state.state,'different-user'),/different login/);
  assert.throws(()=>verifyOAuthState(undefined,state.state,user),/different login/);
});
test('only the three configured Calendar scopes are requested and partial consent is refused',()=>{
  assert.equal(GOOGLE_SCOPES.length,3);assert.ok(GOOGLE_SCOPES.every(scope=>scope.includes('/auth/calendar.')));
  assert.deepEqual(grantedScopes(GOOGLE_SCOPES.join(' ')),[...GOOGLE_SCOPES]);
  assert.throws(()=>grantedScopes(GOOGLE_SCOPES.slice(0,2).join(' ')),/all three/);
});
test('public connection metadata excludes credentials and cross-user identifiers',()=>{
  const result=publicConnection({auth_user_id:user,google_primary_calendar_id:'synthetic@example.invalid',encrypted_refresh_token:'secret-refresh',encrypted_access_token:'secret-access',token_version:'private-version',connected_at:'2026-10-19T12:00Z',status:'connected',last_error:null} as UserGoogleConnection);
  const json=JSON.stringify(result);assert.ok(!json.includes('secret'));assert.ok(!json.includes(user));assert.ok(!json.includes('private-version'));
});
test('availability ranges reject invalid, inverted and unbounded queries',()=>{
  assert.throws(()=>validateRange('invalid','2026-10-19T12:00Z'),/valid time range/);
  assert.throws(()=>validateRange('2026-10-20T12:00Z','2026-10-19T12:00Z'),/valid time range/);
  assert.throws(()=>validateRange('2026-10-19T12:00Z','2027-10-19T12:00Z'),/valid time range/);
  assert.equal(validateRange('2026-10-19T12:00Z','2026-10-20T12:00Z').start,'2026-10-19T12:00:00.000Z');
});
test('access tokens refresh automatically and invalid grants require reconnection without exposing provider text',async()=>{
  const original=globalThis.fetch;
  const row:UserGoogleConnection={auth_user_id:user,google_primary_calendar_id:'synthetic@example.invalid',encrypted_refresh_token:encryptGoogleToken('synthetic-refresh-token',user),encrypted_access_token:null,access_expires_at:null,granted_scopes:[...GOOGLE_SCOPES],token_version:'version-one',status:'connected',connected_at:new Date().toISOString(),last_error:null};
  let invalid=false,tokenCalls=0;
  globalThis.fetch=async(input,options)=>{
    const url=String(input);
    if(url.startsWith('https://google-test.invalid/rest/v1/google_user_connections')){
      if(options?.method==='PATCH'){Object.assign(row,JSON.parse(String(options.body)));return Response.json([{auth_user_id:user}]);}
      return Response.json([row]);
    }
    if(url==='https://oauth2.googleapis.com/token'){
      tokenCalls++;
      if(invalid)return Response.json({error:'invalid_grant',error_description:'provider-private-details'},{status:400});
      return Response.json({access_token:'synthetic-access-token',expires_in:3600});
    }
    throw new Error('Unexpected synthetic request');
  };
  try{
    assert.equal(await accessToken(user),'synthetic-access-token');assert.equal(tokenCalls,1);
    assert.equal(await accessToken(user),'synthetic-access-token');assert.equal(tokenCalls,1);
    assert.equal(decryptGoogleToken(row.encrypted_access_token!,user),'synthetic-access-token');
    invalid=true;
    await assert.rejects(()=>accessToken(user,true),error=>error instanceof Error && error.message.includes('expired or was revoked') && !error.message.includes('provider-private-details'));
    assert.equal(row.status,'reconnect_required');assert.equal(row.encrypted_access_token,null);
  }finally{globalThis.fetch=original;}
});
test('provider 401 triggers one automatic refresh and retry',async()=>{
  const original=globalThis.fetch;let calendarCalls=0;
  const row={auth_user_id:user,google_primary_calendar_id:'synthetic@example.invalid',encrypted_refresh_token:encryptGoogleToken('synthetic-refresh',user),encrypted_access_token:encryptGoogleToken('old-access',user),access_expires_at:new Date(Date.now()+3600000).toISOString(),token_version:'version-one',status:'connected'};
  globalThis.fetch=async(input,options)=>{
    const url=String(input);
    if(url.startsWith('https://google-test.invalid/rest/v1/google_user_connections')){
      if(options?.method==='PATCH'){Object.assign(row,JSON.parse(String(options.body)));return Response.json([{auth_user_id:user}]);}return Response.json([row]);
    }
    if(url==='https://oauth2.googleapis.com/token')return Response.json({access_token:'new-access',expires_in:3600});
    if(url.includes('/calendar/v3/')){calendarCalls++;return Response.json({items:[]},{status:calendarCalls===1?401:200});}
    throw new Error('Unexpected synthetic request');
  };
  try{assert.equal((await googleRequest(user,'users/me/calendarList')).status,200);assert.equal(calendarCalls,2);}finally{globalThis.fetch=original;}
});
test('revocation sends the token in a POST body and never in the URL',async()=>{
  const original=globalThis.fetch;
  globalThis.fetch=async(input,options)=>{assert.equal(String(input),'https://oauth2.googleapis.com/revoke');assert.equal(options?.method,'POST');assert.equal(new URLSearchParams(String(options?.body)).get('token'),'synthetic-revoke');return new Response('',{status:200});};
  try{assert.equal(await revokeToken('synthetic-revoke'),true);}finally{globalThis.fetch=original;}
});

test('paid call synchronization creates one invited Meet event, preserves it on reschedule and cancels it',async()=>{
  const original=globalThis.fetch;
  const connection={auth_user_id:user,calendar_id:'primary',busy_calendar_ids:['primary'],status:'connected'};
  const account={auth_user_id:user,status:'connected',encrypted_refresh_token:encryptGoogleToken('synthetic-refresh',user),encrypted_access_token:encryptGoogleToken('synthetic-access',user),access_expires_at:new Date(Date.now()+3600000).toISOString()};
  let event:Record<string,unknown>|null=null,eventId:string|null=null;
  const writes:Array<{method:string;url:string;body:Record<string,unknown>|null}>=[];
  globalThis.fetch=async(input,options)=>{
    const url=String(input),method=options?.method || 'GET';
    if(url.startsWith('https://google-test.invalid/rest/v1/')){
      if(url.includes('/google_calendar_connections'))return Response.json(method==='PATCH'?null:[connection]);
      if(url.includes('/google_user_connections'))return Response.json([account]);
      if(url.includes('/reading_details'))return Response.json({google_calendar_event_id:eventId});
      if(url.includes('/rpc/booking_store_calendar')){eventId=JSON.parse(String(options?.body)).p_event;return Response.json(null);}
    }
    if(url.startsWith('https://www.googleapis.com/calendar/v3/calendars/primary/events')){
      if(method==='GET')return event?Response.json(event):Response.json({}, {status:404});
      const body=options?.body?JSON.parse(String(options.body)):null;
      writes.push({method,url,body});
      if(method==='DELETE'){event=null;return new Response(null,{status:204});}
      event={...event,...body,hangoutLink:'https://meet.google.com/synthetic-test',conferenceData:{entryPoints:[{entryPointType:'video',uri:'https://meet.google.com/synthetic-test'}]}};
      return Response.json(event);
    }
    throw new Error('Unexpected synthetic request');
  };
  const order={id:'22222222-2222-4222-8222-222222222222',status:'confirmed',service_title:'Synthetic call',booking_version:1,scheduled_at:'2026-10-25T10:00:00Z',scheduled_end_at:'2026-10-25T10:30:00Z',customer_timezone:'Europe/Berlin',customer_email_snapshot:'synthetic@example.invalid'} as BookingOrder;
  try{
    await syncEvent(order);await syncEvent(order);
    assert.equal(writes.length,1);assert.equal(writes[0].method,'POST');
    assert.match(writes[0].url,/conferenceDataVersion=1&sendUpdates=all/);
    assert.deepEqual(writes[0].body?.attendees,[{email:'synthetic@example.invalid'}]);
    assert.deepEqual(writes[0].body?.start,{dateTime:order.scheduled_at,timeZone:'Europe/Berlin'});
    assert.ok(writes[0].body?.conferenceData);
    order.booking_version=2;order.scheduled_at='2026-10-26T10:00:00Z';order.scheduled_end_at='2026-10-26T10:30:00Z';
    await syncEvent(order);assert.equal(writes[1].method,'PATCH');
    assert.deepEqual(writes[1].body?.conferenceData,{entryPoints:[{entryPointType:'video',uri:'https://meet.google.com/synthetic-test'}]});
    order.status='cancelled';order.booking_version=3;await syncEvent(order);
    assert.equal(writes[2].method,'DELETE');assert.match(writes[2].url,/sendUpdates=all/);assert.equal(event,null);
  }finally{globalThis.fetch=original;}
});
