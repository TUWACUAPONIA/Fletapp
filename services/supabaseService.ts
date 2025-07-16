
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Enums refactored to simple string literal types for better type compatibility and to resolve TS errors.
export type VehicleType = 'Furgoneta' | 'Furgón' | 'Pick UP' | 'Camión ligero' | 'Camión pesado';
export type UserRole = 'customer' | 'driver';
export type TripStatus = 'requested' | 'accepted' | 'in_transit' | 'completed' | 'paid';


// Define the database types for better type safety with Supabase
export type Database = {
  public: {
    Tables: {
      trips: {
        Row: {
          id: number;
          customer_id: string;
          driver_id: string | null;
          origin: string;
          destination:string;
          cargo_details: string;
          estimated_weight_kg: number;
          estimated_volume_m3: number;
          distance_km: number | null;
          estimated_drive_time_min: number | null;
          estimated_load_time_min: number | null;
          estimated_unload_time_min: number | null;
          driver_arrival_time_min: number | null;
          price: number | null;
          status: TripStatus;
          suitable_vehicle_types: VehicleType[] | null;
          start_time: string | null;
          final_duration_min: number | null;
          final_price: number | null;
          created_at: string | null;
        };
        Insert: {
          customer_id: string;
          driver_id?: string | null;
          origin: string;
          destination: string;
          cargo_details: string;
          estimated_weight_kg: number;
          estimated_volume_m3: number;
          distance_km?: number | null;
          estimated_drive_time_min?: number | null;
          estimated_load_time_min?: number | null;
          estimated_unload_time_min?: number | null;
          price?: number | null;
          status: TripStatus;
          suitable_vehicle_types?: VehicleType[] | null;
        };
        Update: {
          customer_id?: string;
          driver_id?: string | null;
          origin?: string;
          destination?: string;
          cargo_details?: string;
          estimated_weight_kg?: number;
          estimated_volume_m3?: number;
          distance_km?: number | null;
          estimated_drive_time_min?: number | null;
          estimated_load_time_min?: number | null;
          estimated_unload_time_min?: number | null;
          driver_arrival_time_min?: number | null;
          price?: number | null;
          status?: TripStatus;
          suitable_vehicle_types?: VehicleType[] | null;
          start_time?: string | null;
          final_duration_min?: number | null;
          final_price?: number | null;
        };
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          dni: string;
          phone: string;
          address: string;
          role: UserRole;
          vehicle: string | null;
          vehicle_type: VehicleType | null;
          capacity_kg: number | null;
          capacity_m3: number | null;
          service_radius_km: number | null;
          photo_url: string | null;
          payment_info: string | null;
        };
        Insert: {
            id: string;
            email: string;
            full_name: string;
            dni: string;
            phone: string;
            address: string;
            role: UserRole;
            vehicle?: string | null;
            vehicle_type?: VehicleType | null;
            capacity_kg?: number | null;
            capacity_m3?: number | null;
            service_radius_km?: number | null;
            photo_url?: string | null;
            payment_info?: string | null;
        };
        Update: {
          email?: string;
          full_name?: string;
          dni?: string;
          phone?: string;
          address?: string;
          role?: UserRole;
          vehicle?: string | null;
          vehicle_type?: VehicleType | null;
          capacity_kg?: number | null;
          capacity_m3?: number | null;
          service_radius_km?: number | null;
          photo_url?: string | null;
          payment_info?: string | null;
        };
      };
      chat_messages: {
        Row: {
          id: number;
          trip_id: number;
          sender_id: string;
          content: string;
          created_at: string;
        };
        Insert: {
          trip_id: number;
          sender_id: string;
          content: string;
        };
        Update: {
          content?: string;
        };
      };
      reviews: {
        Row: {
          id: number;
          trip_id: number;
          reviewer_id: string; // customer's id
          driver_id: string;
          rating: number; // 1 to 5
          comment: string;
          created_at: string;
        };
        Insert: {
          trip_id: number;
          reviewer_id: string;
          driver_id: string;
          rating: number;
          comment: string;
        };
        Update: {
          rating?: number;
          comment?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

// --- Supabase Client Initialization ---

const supabaseUrl = 'https://xgzsfxngiurjxkxxbmdo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnenNmeG5naXVyanhreHhibWRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1Nzk5MDIsImV4cCI6MjA2ODE1NTkwMn0.jRHz4iyo213_w9Rh33nDe_Mj53oz9FQOIjmcJ8wQy7g';

if (!supabaseUrl || !supabaseKey) {
  // In a real app, you'd want a more robust way to handle this,
  // maybe showing an error page, but for this context, throwing is fine.
  throw new Error("Supabase URL or Key is not defined. Please check your environment variables.");
}

// Create and export the Supabase client, correctly typed with the Database definition.
// This is the standard and recommended way to initialize the client.
export const supabase: SupabaseClient<Database> = createClient<Database>(supabaseUrl, supabaseKey);
