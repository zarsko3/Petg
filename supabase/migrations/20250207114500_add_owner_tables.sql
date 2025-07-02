-- Migration: Add collars and beacons tables with RLS for Clerk user authentication
-- Date: 2025-02-07
-- Description: Creates multi-tenant collar and beacon management with owner-based access control

-- Collars table - stores pet collar devices
CREATE TABLE public.collars (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mac_addr     text UNIQUE NOT NULL,
  name         text NOT NULL,
  firmware_ver text,
  device_id    text UNIQUE,
  ip_address   text,
  status       text DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'maintenance')),
  battery_level integer DEFAULT 0 CHECK (battery_level >= 0 AND battery_level <= 100),
  last_seen    timestamptz,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

-- Beacons table - stores proximity beacons for each collar
CREATE TABLE public.beacons (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  collar_id    uuid NOT NULL REFERENCES public.collars(id) ON DELETE CASCADE,
  uuid         text NOT NULL,
  major        integer,
  minor        integer,
  friendly_name text NOT NULL,
  room_name     text,
  position_x    real DEFAULT 0,
  position_y    real DEFAULT 0,
  inner_radius  integer DEFAULT 100 CHECK (inner_radius > 0),
  outer_radius  integer DEFAULT 200 CHECK (outer_radius > inner_radius),
  alert_enabled boolean DEFAULT true,
  alert_mode    text DEFAULT 'both' CHECK (alert_mode IN ('buzzer', 'vibration', 'both')),
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  
  -- Ensure unique beacon UUID per owner
  UNIQUE(owner_id, uuid)
);

-- Collar locations table - stores real-time position data
CREATE TABLE public.collar_locations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collar_id   uuid NOT NULL REFERENCES public.collars(id) ON DELETE CASCADE,
  owner_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  x           real NOT NULL,
  y           real NOT NULL,
  confidence  real DEFAULT 0.0 CHECK (confidence >= 0.0 AND confidence <= 1.0),
  accuracy    real DEFAULT 0.0,
  zone_id     uuid,
  recorded_at timestamptz DEFAULT now()
);

-- Collar events table - stores alert history and events
CREATE TABLE public.collar_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collar_id   uuid NOT NULL REFERENCES public.collars(id) ON DELETE CASCADE,
  owner_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type  text NOT NULL CHECK (event_type IN ('alert', 'zone_enter', 'zone_exit', 'battery_low', 'offline', 'online')),
  beacon_id   uuid REFERENCES public.beacons(id),
  message     text,
  metadata    jsonb,
  created_at  timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_collars_owner_id ON public.collars(owner_id);
CREATE INDEX idx_collars_mac_addr ON public.collars(mac_addr);
CREATE INDEX idx_collars_device_id ON public.collars(device_id);
CREATE INDEX idx_collars_status ON public.collars(status);

CREATE INDEX idx_beacons_owner_id ON public.beacons(owner_id);
CREATE INDEX idx_beacons_collar_id ON public.beacons(collar_id);
CREATE INDEX idx_beacons_uuid ON public.beacons(uuid);

CREATE INDEX idx_collar_locations_collar_id ON public.collar_locations(collar_id);
CREATE INDEX idx_collar_locations_owner_id ON public.collar_locations(owner_id);
CREATE INDEX idx_collar_locations_recorded_at ON public.collar_locations(recorded_at);

CREATE INDEX idx_collar_events_collar_id ON public.collar_events(collar_id);
CREATE INDEX idx_collar_events_owner_id ON public.collar_events(owner_id);
CREATE INDEX idx_collar_events_created_at ON public.collar_events(created_at);
CREATE INDEX idx_collar_events_event_type ON public.collar_events(event_type);

-- Enable Row-Level Security on all tables
ALTER TABLE public.collars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beacons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collar_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collar_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for collars table
CREATE POLICY "Users can manage their own collars" ON public.collars
  FOR ALL USING (owner_id = (auth.jwt() ->> 'sub')::uuid);

-- RLS Policies for beacons table  
CREATE POLICY "Users can manage their own beacons" ON public.beacons
  FOR ALL USING (owner_id = (auth.jwt() ->> 'sub')::uuid);

-- RLS Policies for collar_locations table
CREATE POLICY "Users can access their collar locations" ON public.collar_locations
  FOR ALL USING (owner_id = (auth.jwt() ->> 'sub')::uuid);

-- RLS Policies for collar_events table
CREATE POLICY "Users can access their collar events" ON public.collar_events
  FOR ALL USING (owner_id = (auth.jwt() ->> 'sub')::uuid);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_collars_updated_at BEFORE UPDATE ON public.collars
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_beacons_updated_at BEFORE UPDATE ON public.beacons
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create a function to get collar statistics
CREATE OR REPLACE FUNCTION public.get_collar_stats(collar_uuid uuid)
RETURNS TABLE (
  total_beacons integer,
  active_beacons integer,
  recent_events integer,
  last_location_update timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*)::integer FROM public.beacons WHERE collar_id = collar_uuid),
    (SELECT COUNT(*)::integer FROM public.beacons WHERE collar_id = collar_uuid AND alert_enabled = true),
    (SELECT COUNT(*)::integer FROM public.collar_events WHERE collar_id = collar_uuid AND created_at > now() - interval '24 hours'),
    (SELECT MAX(recorded_at) FROM public.collar_locations WHERE collar_id = collar_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to log collar events
CREATE OR REPLACE FUNCTION public.log_collar_event(
  p_collar_id uuid,
  p_event_type text,
  p_beacon_id uuid DEFAULT NULL,
  p_message text DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  event_id uuid;
  collar_owner_id uuid;
BEGIN
  -- Get the collar owner ID
  SELECT owner_id INTO collar_owner_id 
  FROM public.collars 
  WHERE id = p_collar_id;
  
  IF collar_owner_id IS NULL THEN
    RAISE EXCEPTION 'Collar not found';
  END IF;
  
  -- Insert the event
  INSERT INTO public.collar_events (collar_id, owner_id, event_type, beacon_id, message, metadata)
  VALUES (p_collar_id, collar_owner_id, p_event_type, p_beacon_id, p_message, p_metadata)
  RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.collars TO authenticated;
GRANT ALL ON public.beacons TO authenticated;
GRANT ALL ON public.collar_locations TO authenticated;
GRANT ALL ON public.collar_events TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_collar_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_collar_event TO authenticated;
