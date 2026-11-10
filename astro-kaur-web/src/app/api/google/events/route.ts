import {NextRequest,NextResponse} from 'next/server';
import {apiError,BookingError,requireUser} from '@/lib/booking/server';
import {accessibleCalendars,googleRequest,validateRange} from '@/lib/google/accounts';
export async function GET(req:NextRequest){
  try{
    const {user}=await requireUser(),range=validateRange(req.nextUrl.searchParams.get('start'),req.nextUrl.searchParams.get('end'));
    const calendars=await accessibleCalendars(user.id),id=req.nextUrl.searchParams.get('calendar') || 'primary';
    const selected=calendars.find(c=>id==='primary'?c.primary:c.id===id);
    if(!selected || selected.accessRole==='freeBusyReader')throw new BookingError('This calendar does not grant event-reading access.',403);
    const query=new URLSearchParams({timeMin:range.start,timeMax:range.end,singleEvents:'true',orderBy:'startTime',maxResults:'250'});
    const pageToken=req.nextUrl.searchParams.get('page_token');if(pageToken)query.set('pageToken',pageToken.slice(0,2000));
    const response=await googleRequest(user.id,`calendars/${encodeURIComponent(selected.id)}/events?${query}`);
    if(!response.ok)throw new BookingError('Calendar events could not be read. Check permissions and reconnect if necessary.',503);
    const result=await response.json() as {items?:Array<{id:string;summary?:string;status:string;start:unknown;end:unknown;transparency?:string}>;nextPageToken?:string;timeZone?:string};
    return NextResponse.json({calendar_id:selected.id,time_zone:result.timeZone,events:(result.items || []).map(event=>({id:event.id,summary:event.summary || 'Busy',status:event.status,start:event.start,end:event.end,transparency:event.transparency})),next_page_token:result.nextPageToken},{headers:{'Cache-Control':'no-store'}});
  }catch(error){return apiError(error);}
}
