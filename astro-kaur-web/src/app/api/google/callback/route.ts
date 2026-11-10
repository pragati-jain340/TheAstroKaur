import { cookies } from "next/headers";
import { NextRequest,NextResponse } from "next/server";
import { apiError,BookingError,requireUser,siteUrl } from "@/lib/booking/server";
import { exchangeToken,verifyOAuthState,type GooglePurpose } from "@/lib/google/oauth";
import { saveAuthorization } from "@/lib/google/accounts";
function settingsRedirect(purpose:GooglePurpose,result:'connected'|'error',message?:string){
  const target=new URL(purpose==='organizer'?'/admin/calendar':'/account',siteUrl());
  target.searchParams.set('tab',purpose==='organizer'?'integrations':'profile');
  target.searchParams.set('google',result);
  if(message)target.searchParams.set('message',message);
  target.hash=purpose==='organizer'?'booking-settings':'google-calendar-settings';
  return NextResponse.redirect(target);
}
export async function GET(req:NextRequest) {
  let purpose:GooglePurpose='account';
  let validated=false;
  try {
    const {user,isAdmin}=await requireUser(),jar=await cookies();
    const saved=jar.get('google_booking_oauth')?.value;
    jar.delete({name:'google_booking_oauth',path:'/api/google'});
    purpose=verifyOAuthState(saved,req.nextUrl.searchParams.get('state'),user.id);
    validated=true;
    if(purpose==='organizer' && !isAdmin)throw new BookingError('Administrator access is required for the booking organizer.',403);
    if(req.nextUrl.searchParams.has('error'))throw new BookingError('Google access was not approved. Select Connect and grant the Calendar permissions.',400);
    const code=req.nextUrl.searchParams.get('code');if(!code)throw new BookingError('Google authorization code is missing. Start Connect again.');
    const token=await exchangeToken({grant_type:'authorization_code',code});
    await saveAuthorization(user.id,token,purpose==='organizer');
    return settingsRedirect(purpose,'connected');
  } catch(error) {
    if(!validated)return apiError(error);
    const message=error instanceof BookingError?error.message:'Google connection could not be completed. Try connecting again.';
    return settingsRedirect(purpose,'error',message);
  }
}
