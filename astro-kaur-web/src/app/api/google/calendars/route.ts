import {NextResponse} from 'next/server';
import {apiError,requireUser} from '@/lib/booking/server';
import {accessibleCalendars} from '@/lib/google/accounts';
export async function GET(){
  try{const {user}=await requireUser();return NextResponse.json({calendars:await accessibleCalendars(user.id)},{headers:{'Cache-Control':'no-store'}});}
  catch(error){return apiError(error);}
}
