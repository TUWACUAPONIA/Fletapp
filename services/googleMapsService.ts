export interface TripDetails {
  distanceMeters: number;
  durationSeconds: number;
}

/**
 * Calls our Vercel Serverless Function to get trip details from Google Maps API.
 * @param origin The starting point of the trip.
 * @param destination The end point of the trip.
 * @returns A promise that resolves to a TripDetails object or null.
 */
export const getTripDetails = async (
  origin: string,
  destination: string
): Promise<TripDetails | null> => {
  try {
    // This now calls our own API route, which acts as a proxy.
    const response = await fetch('/api/google-maps-proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ origin, destination }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Request failed with status ${response.status}`);
    }

    const data = await response.json();
    return data as TripDetails;
  } catch (err: any) {
    console.error('Error fetching trip details from Google Maps proxy:', err.message);
    return null;
  }
};