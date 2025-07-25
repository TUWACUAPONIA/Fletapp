
import { createClient } from '@supabase/supabase-js';

// --- Standalone Enum Types ---
// This prevents circular type dependencies that cause resolution issues.
export type TripStatusEnum = "requested" | "accepted" | "in_transit" | "completed" | "paid";
export type UserRoleEnum = "customer" | "driver";
export type VehicleTypeEnum = "Furgoneta" | "Furgón" | "Pick UP" | "Camión ligero" | "Camión pesado";

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
          destination: string;
          cargo_details: string;
          estimated_weight_kg: number;
          estimated_volume_m3: number;
          distance_km: number | null;
          estimated_drive_time_min: number | null;
          estimated_load_time_min: number | null;
          estimated_unload_time_min: number | null;
          driver_arrival_time_min: number | null;
          price: number | null;
          status: TripStatusEnum;
          suitable_vehicle_types: VehicleTypeEnum[] | null;
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
          status: TripStatusEnum;
          suitable_vehicle_types?: VehicleTypeEnum[] | null;
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
          status?: TripStatusEnum;
          suitable_vehicle_types?: VehicleTypeEnum[] | null;
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
          role: UserRoleEnum;
          vehicle: string | null;
          vehicle_type: VehicleTypeEnum | null;
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
            role: UserRoleEnum;
            vehicle?: string | null;
            vehicle_type?: VehicleTypeEnum | null;
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
          role?: UserRoleEnum;
          vehicle?: string | null;
          vehicle_type?: VehicleTypeEnum | null;
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
      trip_status: TripStatusEnum;
      user_role: UserRoleEnum;
      vehicle_type: VehicleTypeEnum;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

// --- Supabase Client Initialization ---

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  // In a real app, you'd want a more robust way to handle this,
  // maybe showing an error page, but for this context, throwing is fine.
  throw new Error("Supabase URL or Key is not defined. Please check your environment variables. Make sure to create a .env.local file and add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
}

// Create and export the Supabase client, correctly typed with the Database definition.
// This is the standard and recommended way to initialize the client.
export const supabase = createClient<Database>(supabaseUrl, supabaseKey);