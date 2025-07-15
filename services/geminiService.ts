import { supabase } from './supabaseService';

export interface TripEstimate {
  distanceKm: number;
  estimatedDriveTimeMin: number;
  estimatedLoadTimeMin: number;
  estimatedUnloadTimeMin: number;
}

/**
 * Calls a secure backend function to get trip estimates.
 * @param origin The starting point of the trip.
 * @param destination The end point of the trip.
 * @param cargoDetails A description of the cargo.
 * @returns A promise that resolves to a TripEstimate object or null.
 */
export const getTripEstimates = async (
  origin: string,
  destination: string,
  cargoDetails: string
): Promise<TripEstimate | null> => {
  try {
    const { data, error } = await supabase.functions.invoke('gemini-proxy', {
      body: { 
        action: 'getTripEstimates',
        payload: { origin, destination, cargoDetails }
      },
    });

    if (error) {
      throw error;
    }

    // The data is the parsed JSON response from the Edge Function
    return data as TripEstimate;
  } catch (err) {
    console.error('Error invoking Supabase function for trip estimates:', err);
    return null;
  }
};

/**
 * Calls a secure backend function to get a driver's ETA.
 * @param driverLocation The driver's current location.
 * @param tripOrigin The pickup location for the trip.
 * @returns A promise that resolves to the ETA in minutes or null.
 */
export const getDriverEta = async (
  driverLocation: string,
  tripOrigin: string
): Promise<number | null> => {
   try {
    const { data, error } = await supabase.functions.invoke('gemini-proxy', {
      body: { 
        action: 'getDriverEta',
        payload: { driverLocation, tripOrigin }
      },
    });

    if (error) {
      throw error;
    }

    // The data from the function is { etaMinutes: number }
    return data.etaMinutes ?? null;
  } catch (err) {
    console.error('Error invoking Supabase function for driver ETA:', err);
    return null;
  }
};
