
export enum UserRole {
  CUSTOMER = 'customer',
  DRIVER = 'driver',
}

export enum TripStatus {
  REQUESTED = 'requested', // formerly PENDING
  ACCEPTED = 'accepted',
  IN_TRANSIT = 'in_transit',
  COMPLETED = 'completed',
  PAID = 'paid',
}

export interface User {
  id: string; // This will be a UUID from Supabase Auth
  email: string;
  full_name: string;
  phone: string;
  address: string;
}

export interface Driver extends User {
  role: UserRole.DRIVER;
  vehicle: string;
  capacity_kg: number;
  capacity_m3: number;
  service_radius_km: number;
  photo_url: string;
}

export interface Customer extends User {
  role: UserRole.CUSTOMER;
}

export interface Profile extends User {
  role: UserRole;
  vehicle?: string | null;
  capacity_kg?: number | null;
  capacity_m3?: number | null;
  service_radius_km?: number | null;
  photo_url?: string | null;
}

export type AnyUser = Driver | Customer;

export interface Trip {
  id: number; // Changed to number to match PostgreSQL BIGINT SERIAL
  customer_id: string; // UUID
  driver_id: string | null; // UUID
  origin: string;
  destination:string;
  cargo_details: string;
  estimated_weight_kg: number;
  estimated_volume_m3: number;
  distance_km?: number;
  estimated_drive_time_min?: number;
  estimated_load_time_min?: number;
  estimated_unload_time_min?: number;
  driver_arrival_time_min?: number;
  price?: number;
  status: TripStatus;
  start_time?: string; // Supabase returns ISO string
  final_duration_min?: number;
  final_price?: number;
  created_at?: string;
}

export enum SortKey {
  TRIPS = 'trips',
  KILOGRAMS = 'kilograms',
  VOLUME = 'volume',
  KILOMETERS = 'kilometers',
}

export type View = 'home' | 'landing' | 'onboarding' | 'login' | 'dashboard' | 'rankings' | 'tripStatus';