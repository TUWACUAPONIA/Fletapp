// This is a Vercel Serverless Function, which runs in a Node.js environment.
// It replaces the previous Supabase Edge Function for better integration with Vercel hosting.

// Note: For type safety, you might want to install Vercel's Node types: `npm install @vercel/node`
// The function will work without them, but types are recommended.

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers to allow requests from your frontend domain
  // In production, you should restrict this to your actual domain
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    // Vercel automatically parses the body for POST requests
    const { origin, destination } = req.body;
    if (!origin || !destination) {
      return res.status(400).json({ error: 'Origin and destination are required.' });
    }

    // In Vercel, environment variables are available via process.env
    // Ensure you have VITE_GOOGLE_MAPS_API_KEY set in your Vercel project settings.
    const GOOGLE_MAPS_API_KEY = process.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!GOOGLE_MAPS_API_KEY) {
      console.error('Google Maps API key is not configured on the server.');
      return res.status(500).json({ error: 'Server configuration error.' });
    }

    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?units=metric&origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}&key=${GOOGLE_MAPS_API_KEY}`;

    const apiResponse = await fetch(url);
    const data = await apiResponse.json();

    if (data.status !== 'OK' || !data.rows[0]?.elements[0]) {
        throw new Error(`Google Maps API Error: ${data.status} - ${data.error_message || 'No route found.'}`);
    }
    
    const element = data.rows[0].elements[0];

    if (element.status !== 'OK') {
        throw new Error(`Could not find a route between origin and destination. Status: ${element.status}`);
    }

    const tripDetails = {
      distanceMeters: element.distance.value,
      durationSeconds: element.duration.value,
    };

    return res.status(200).json(tripDetails);

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    console.error('Error in google-maps-proxy:', message);
    return res.status(500).json({ error: 'An internal server error occurred.' });
  }
}