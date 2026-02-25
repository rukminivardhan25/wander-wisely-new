-- Flight schedules: one row = this flight on this date (e.g. 6E-201 on 2026-02-25).
CREATE TABLE IF NOT EXISTS public.flight_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flight_id uuid NOT NULL REFERENCES public.flights(id) ON DELETE CASCADE,
  route_id uuid NOT NULL REFERENCES public.flight_routes(id) ON DELETE CASCADE,

  schedule_date date NOT NULL,
  departure_time time NOT NULL,
  arrival_time time NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_flight_schedules_flight_id ON public.flight_schedules(flight_id);
CREATE INDEX IF NOT EXISTS idx_flight_schedules_route_id ON public.flight_schedules(route_id);
CREATE INDEX IF NOT EXISTS idx_flight_schedules_date ON public.flight_schedules(schedule_date);
