import {NextRequest,NextResponse} from 'next/server';
import {apiError,BookingError,requireUser} from '@/lib/booking/server';
import {accessibleCalendars,googleRequest,validateRange} from '@/lib/google/accounts';
import type {Interval} from '@/lib/booking/types';
export async function POST(req:NextRequest){
  try{
    const {user}=await requireUser(),body=await req.json(),range=validateRange(body.start,body.end);
    const ids=body.calendar_ids;if(!Array.isArray(ids) || !ids.length || ids.length>20 || ids.some(id=>typeof id!=='string'))throw new BookingError('Select between one and 20 calendars.');
    const calendars=await accessibleCalendars(user.id),primary=calendars.find(c=>c.primary);
    const selected=[...new Set(ids.map((id:string)=>id==='primary'?primary?.id || id:id))];
    if(selected.some(id=>!calendars.some(c=>c.id===id)))throw new BookingError('A selected calendar is not accessible to your connected account.',403);
    const response=await googleRequest(user.id,'freeBusy',{method:'POST',body:JSON.stringify({timeMin:range.start,timeMax:range.end,items:selected.map(id=>({id}))})});
    if(!response.ok)throw new BookingError('Google availability could not be checked. Please try again shortly.',503);
    const result=await response.json() as {calendars:Record<string,{busy:Interval[];errors?:unknown[]}>};
    if(selected.some(id=>!result.calendars[id] || result.calendars[id].errors?.length))throw new BookingError('One or more calendars do not permit availability checks.',403);
    return NextResponse.json({calendars:selected.map(id=>({id,busy:result.calendars[id].busy}))},{headers:{'Cache-Control':'no-store'}});
  }catch(error){return apiError(error);}
}
