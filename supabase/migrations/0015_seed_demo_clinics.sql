-- ============================================================================
-- 0015 — Demo seed: 6 AHPRA-active dentists + clinics around Camberwell
-- ============================================================================
-- Strictly demo data so the map view + live feed look populated for App Store
-- screenshots and TestFlight reviewers. Idempotent — wrapped in fixed UUIDs so
-- a second run is a no-op.
--
-- IMPORTANT: This is real RLS-bypassing seed via service role context
-- (migrations run as postgres). Do NOT use the AHPRA numbers here for any
-- real-world identity claim — they're constructed and clearly marked DEMO in
-- the dentist's full_name.
--
-- To wipe demo data:
--   delete from public.clinics where id in (...the six uuids below);
--   delete from public.users   where id in (...the six uuids below);
-- ============================================================================

-- Anchor: 3 Burke Rd, Camberwell VIC 3124 (-37.8226, 145.0584)
-- Six clinics within a 3 km radius — what a real Camberwell map should show.

do $$
declare
  rows record;
  uid uuid;
begin
  for rows in
    select * from (values
      ('11111111-1111-1111-1111-111111111101'::uuid, 'Dr Sarah Chen (DEMO)',     'DEN0000000001', 'General',     'Camberwell Smile Studio',     '12345678901', '789 Burke Rd, Camberwell VIC',     -37.8243, 145.0590),
      ('11111111-1111-1111-1111-111111111102'::uuid, 'Dr Liam O''Connor (DEMO)', 'DEN0000000002', 'General',     'Hawthorn Dental Collective',  '12345678902', '210 Glenferrie Rd, Hawthorn VIC', -37.8221, 145.0356),
      ('11111111-1111-1111-1111-111111111103'::uuid, 'Dr Priya Patel (DEMO)',    'DEN0000000003', 'Specialist',  'Boroondara Cosmetic Dental',  '12345678903', '350 Camberwell Rd, Camberwell VIC',-37.8254, 145.0682),
      ('11111111-1111-1111-1111-111111111104'::uuid, 'Dr Michael Tran (DEMO)',   'DEN0000000004', 'General',     'East Melbourne Dental',       '12345678904', '14 Bridge Rd, Richmond VIC',      -37.8194, 145.0001),
      ('11111111-1111-1111-1111-111111111105'::uuid, 'Dr Emma Wallace (DEMO)',   'DEN0000000005', 'General',     'Surrey Hills Family Dental',  '12345678905', '102 Union Rd, Surrey Hills VIC',  -37.8225, 145.0972),
      ('11111111-1111-1111-1111-111111111106'::uuid, 'Dr James Kowalski (DEMO)', 'DEN0000000006', 'Specialist',  'Glen Iris Implant Centre',    '12345678906', '1480 High St, Glen Iris VIC',     -37.8553, 145.0610)
    ) as t(uid, full_name, ahpra_no, ahpra_reg_type, clinic_name, abn, address, lat, lng)
  loop
    -- public.users — demo dentist (no matching auth.users; that's fine for
    -- read-only display, but they cannot sign in. RLS reads still see them.)
    insert into public.users (id, role, full_name, ahpra_no, ahpra_reg_type, ahpra_status, ahpra_verified_at)
    values (
      rows.uid, 'dentist', rows.full_name, rows.ahpra_no, rows.ahpra_reg_type,
      'active', now()
    )
    on conflict (id) do nothing;

    -- public.clinics — same uuid for symmetry
    insert into public.clinics (
      id, owner_user_id, name, abn, abn_verified_at, address, location,
      service_radius_km, categories, verified
    )
    values (
      rows.uid, rows.uid, rows.clinic_name, rows.abn, now(), rows.address,
      st_setsrid(st_makepoint(rows.lng, rows.lat), 4326)::geography,
      15,
      array[
        'filling-clean','checkup-clean','whitening','cosmetic',
        'crown-veneer','emergency'
      ]::category[],
      true
    )
    on conflict (id) do nothing;
  end loop;
end$$;
