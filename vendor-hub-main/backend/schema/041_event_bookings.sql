-- Event bookings: user buys tickets. user_id = main app user.
CREATE TABLE IF NOT EXISTS public.event_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_ref text NOT NULL UNIQUE,

  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,

  total_cents int NOT NULL CHECK (total_cents >= 0),

  status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed')),
  paid_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_bookings_event_id ON public.event_bookings(event_id);
CREATE INDEX IF NOT EXISTS idx_event_bookings_user_id ON public.event_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_event_bookings_status ON public.event_bookings(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_bookings_booking_ref ON public.event_bookings(booking_ref);

-- Per-booking ticket breakdown: how many of each ticket type.
CREATE TABLE IF NOT EXISTS public.event_booking_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_booking_id uuid NOT NULL REFERENCES public.event_bookings(id) ON DELETE CASCADE,
  event_ticket_type_id uuid NOT NULL REFERENCES public.event_ticket_types(id) ON DELETE CASCADE,

  quantity int NOT NULL CHECK (quantity >= 1),
  unit_price_cents int NOT NULL CHECK (unit_price_cents >= 0),

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_booking_tickets_booking_id ON public.event_booking_tickets(event_booking_id);
CREATE INDEX IF NOT EXISTS idx_event_booking_tickets_ticket_type_id ON public.event_booking_tickets(event_ticket_type_id);

-- Optional: per-ticket QR codes for check-in (one row per physical ticket).
CREATE TABLE IF NOT EXISTS public.event_booking_ticket_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_booking_ticket_id uuid NOT NULL REFERENCES public.event_booking_tickets(id) ON DELETE CASCADE,

  qr_code text NOT NULL,
  used_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_booking_ticket_codes_booking_ticket_id ON public.event_booking_ticket_codes(event_booking_ticket_id);
