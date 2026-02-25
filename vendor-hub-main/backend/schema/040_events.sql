-- Events: fixed-date, ticketed (concerts, shows, etc.).
-- One event per listing (listing type = 'event').
CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,

  name text NOT NULL,
  category text NOT NULL,
  city text NOT NULL,
  venue_name text NOT NULL,
  venue_address text,
  venue_lat decimal(10, 8),
  venue_lng decimal(11, 8),

  start_date date NOT NULL,
  end_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,

  organizer_name text NOT NULL,
  description text,

  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'suspended', 'live')),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_listing_id ON public.events(listing_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);
CREATE INDEX IF NOT EXISTS idx_events_city ON public.events(city);
CREATE INDEX IF NOT EXISTS idx_events_start_date ON public.events(start_date);

-- Ticket types: General, VIP, Early Bird, etc.
CREATE TABLE IF NOT EXISTS public.event_ticket_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,

  name text NOT NULL,
  price_cents int NOT NULL CHECK (price_cents >= 0),
  quantity_total int NOT NULL CHECK (quantity_total >= 0),
  max_per_user int NOT NULL CHECK (max_per_user >= 1 AND max_per_user <= 50),

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_ticket_types_event_id ON public.event_ticket_types(event_id);

-- Media: poster (mandatory) + optional gallery.
CREATE TABLE IF NOT EXISTS public.event_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,

  file_url text NOT NULL,
  is_poster boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_media_event_id ON public.event_media(event_id);
