// supabase/functions/create-profile/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Standard CORS headers to allow requests from browsers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Initialize the Supabase client with the admin key to bypass RLS
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the profile data from the request body
    const { profileData } = await req.json()

    // Ensure the necessary data is present
    if (!profileData || !profileData.id) {
      throw new Error('Profile data or user ID is missing.')
    }

    // Insert the new profile into the 'profiles' table
    const { error } = await supabaseAdmin.from('profiles').insert(profileData)

    if (error) {
      console.error('Error inserting profile:', error)
      throw error
    }

    // Return a success message
    return new Response(JSON.stringify({ message: `Profile for ${profileData.id} created.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err) {
    // Return an error message if something goes wrong
    console.error('Error in function:', err.message)
    return new Response(String(err?.message ?? err), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})