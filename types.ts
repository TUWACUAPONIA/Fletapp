
import type { Database, UserRole, TripStatus, VehicleType } from './services/supabaseService';

export type { UserRole, TripStatus, VehicleType };

// --- Main Data Types (from Supabase schema) ---
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Trip = Database['public']['Tables']['trips']['Row'];
export type ChatMessage = Database['public']['Tables']['chat_messages']['Row'];
export type Review = Database['public']['Tables']['reviews']['Row'];

// For creating new trips, before system-generated fields are added.
export type NewTrip = Omit<Database['public']['Tables']['trips']['Insert'], 'customer_id' | 'driver_id' | 'status' | 'suitable_vehicle_types'>;


// --- Role-specific Types for clarity and type narrowing ---
// These are subsets of Profile, mainly for asserting roles.
// The properties will have the same nullability as in the database 'Row' type.
export interface Customer extends Profile {
  role: 'customer';
}

export interface Driver extends Profile {
  role: 'driver';
}

// --- App-specific Enums and Types ---
export enum SortKey {
  TRIPS = 'trips',
  KILOGRAMS = 'kilograms',
  VOLUME = 'volume',
  KILOMETERS = 'kilometers',
  RATING = 'rating',
}

export type View = 'home' | 'landing' | 'onboarding' | 'login' | 'dashboard' | 'rankings' | 'tripStatus' | 'driverProfile';
