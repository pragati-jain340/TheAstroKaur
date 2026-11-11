-- The database requires explicit WHERE clauses for deletes, including full replacements.
CREATE OR REPLACE FUNCTION public.booking_save_availability(p_settings jsonb,p_windows jsonb,p_overrides jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_timezone_names WHERE name=p_settings->>'timezone') THEN RAISE EXCEPTION 'Invalid time zone'; END IF;
  UPDATE public.availability_settings SET timezone=p_settings->>'timezone',buffer_minutes=(p_settings->>'buffer_minutes')::integer,
    slot_step_minutes=(p_settings->>'slot_step_minutes')::integer,booking_enabled=(p_settings->>'booking_enabled')::boolean,updated_at=now() WHERE id;
  DELETE FROM public.availability_windows WHERE true;
  INSERT INTO public.availability_windows(weekday,start_local,end_local,enabled) SELECT weekday,start_local,end_local,COALESCE(enabled,true) FROM jsonb_to_recordset(p_windows) AS x(weekday integer,start_local time,end_local time,enabled boolean);
  DELETE FROM public.availability_overrides WHERE true;
  INSERT INTO public.availability_overrides(local_date,mode,start_local,end_local,note) SELECT local_date,mode,start_local,end_local,left(note,250) FROM jsonb_to_recordset(p_overrides) AS x(local_date date,mode text,start_local time,end_local time,note text);
END $$;
