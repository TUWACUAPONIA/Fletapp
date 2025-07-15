

// Declare the Deno global object to satisfy TypeScript's type checker.
// This object is provided by the Deno runtime in Supabase Edge Functions.
declare const Deno: {
  env: {
    get: (key: string) => string | undefined;
  };
};

// Importa los módulos necesarios. 'serve' para correr el servidor y '@google/genai' para la IA.
// Usamos 'npm:' para que Deno/Supabase importe el paquete de npm correctamente.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { GoogleGenAI, Type } from 'npm:@google/genai';

// --- Configuración de CORS ---
// Estas cabeceras son CRUCIALES. Permiten que tu frontend (desplegado en Vercel)
// pueda llamar a esta función (desplegada en Supabase) sin ser bloqueado por el navegador.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Permite peticiones desde cualquier origen. Para producción más estricta, puedes cambiar '*' por tu dominio de Vercel.
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// --- Lógica Principal de la Función ---
serve(async (req: Request) => {
  // Las peticiones de navegador complejas (como POST con JSON) envían primero una petición 'OPTIONS'
  // para verificar los permisos de CORS. Respondemos a ella inmediatamente.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // --- Seguridad: Obtener la API Key de forma segura ---
    // Leemos la clave de API desde los "Secrets" de la función en el dashboard de Supabase.
    // NUNCA escribas la clave directamente en el código.
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('La variable de entorno GEMINI_API_KEY no está configurada en los secretos de la función.');
    }
    
    // --- Router Lógico: Determinar qué acción realizar ---
    // Extraemos la acción y el payload del cuerpo JSON de la petición del frontend.
    const { action, payload } = await req.json();

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    let prompt: string;
    let schema: any; // Usamos 'any' porque el esquema cambia dinámicamente

    // Construimos el prompt y el esquema de respuesta según la acción solicitada.
    if (action === 'getTripEstimates') {
      const { origin, destination, cargoDetails } = payload;
      if (!origin || !destination || !cargoDetails) {
        throw new Error('Faltan datos en el payload para la acción getTripEstimates');
      }
      
      prompt = `Calcula la distancia de conducción estimada, el tiempo de conducción, el tiempo de carga y el tiempo de descarga para un viaje de flete. Proporciona la respuesta como un objeto JSON. El viaje comienza en: "${origin}". El destino es: "${destination}". Los detalles de la carga son: "${cargoDetails}". Basa tus estimaciones en logística realista para un solo conductor.`;
      
      schema = {
        type: Type.OBJECT,
        properties: {
          distanceKm: { type: Type.NUMBER, description: 'Distancia de conducción estimada en kilómetros.' },
          estimatedDriveTimeMin: { type: Type.NUMBER, description: 'Tiempo de conducción estimado en minutos, sin tráfico.' },
          estimatedLoadTimeMin: { type: Type.NUMBER, description: 'Tiempo estimado para cargar la mercancía en minutos.' },
          estimatedUnloadTimeMin: { type: Type.NUMBER, description: 'Tiempo estimado para descargar la mercancía en minutos.' },
        },
        required: ['distanceKm', 'estimatedDriveTimeMin', 'estimatedLoadTimeMin', 'estimatedUnloadTimeMin'],
      };

    } else if (action === 'getDriverEta') {
      const { driverLocation, tripOrigin } = payload;
      if (!driverLocation || !tripOrigin) {
        throw new Error('Faltan datos en el payload para la acción getDriverEta');
      }
      
      prompt = `Calcula el tiempo de viaje estimado en minutos para que un conductor vaya desde su ubicación actual a un punto de recogida. Ubicación actual del conductor: "${driverLocation}". Origen de recogida del viaje: "${tripOrigin}". Proporciona un único tiempo estimado de llegada (ETA) en minutos como un objeto JSON.`;

      schema = {
        type: Type.OBJECT,
        properties: {
          etaMinutes: { type: Type.NUMBER, description: 'Tiempo estimado de llegada en minutos para que el conductor alcance la ubicación de recogida.' },
        },
        required: ['etaMinutes'],
      };

    } else {
      throw new Error(`Acción no válida especificada: "${action}"`);
    }

    // --- Llamada a la API de Gemini ---
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: schema,
      }
    });

    // Devolvemos la respuesta JSON de Gemini al frontend.
    return new Response(response.text, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    // --- Manejo de Errores ---
    // Si algo sale mal (API key faltante, JSON malformado, error de Gemini, etc.),
    // lo capturamos y devolvemos una respuesta de error clara al frontend.
    console.error('Error en la Edge Function gemini-proxy:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500, // Usamos un código de error de servidor.
    });
  }
});