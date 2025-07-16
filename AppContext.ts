

import React from 'react';
import type { AuthError } from '@supabase/supabase-js';
import type { View, Profile, Trip, Review, NewTrip } from './types';
import type { Database } from './services/supabaseService';

// The type definition for the context, which was previously inside App.tsx.
export interface AppContextType {
  user: Profile | null;
  users: Profile[];
  trips: Trip[];
  reviews: Review[];
  view: View;
  setView: (view: View) => void;
  loginUser: (email: string, password: string) => Promise<AuthError | null>;
  registerUser: (userData: Omit<Database['public']['Tables']['profiles']['Insert'], 'id'>, password: string) => Promise<AuthError | null>;
  createTrip: (trip: NewTrip) => Promise<void>;
  acceptTrip: (tripId: number) => Promise<void>;
  startTrip: (tripId: number) => Promise<void>;
  completeTrip: (tripId: number) => Promise<void>;
  processPayment: (tripId: number) => Promise<void>;
  viewTripDetails: (tripId: number) => void;
  sendChatMessage: (tripId: number, content: string) => Promise<void>;
  submitReview: (tripId: number, driverId: string, rating: number, comment: string) => Promise<void>;
  viewDriverProfile: (driverId: string) => void;
  logout: () => Promise<void>;
  activeDriverId: string | null;
}

// Creating and exporting the context itself.
export const AppContext = React.createContext<AppContextType | null>(null);
