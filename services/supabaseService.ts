
import { createClient, SupabaseClient, AuthError } from '@supabase/supabase-js';
import { Trip, AnyUser, Profile } from '../types';

// Define the database types for better type safety with Supabase
export type Database = {
  public: {
    Tables: {
      trips: {
        Row: Trip; // The type of a row in your 'trips' table
        Insert: Omit<Trip, 'id' | 'created_at'>; // The type to use for inserting a new row
        Update: Partial<Omit<Trip, 'id' | 'created_at'>>; // The type to use for updating a row
      };
      profiles: {
        Row: Profile;
        Insert: Profile;
        Update: Partial<Profile>;
      }
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
  };
};

const mockError = (message: string): AuthError => ({
    message,
    name: 'MockAuthError',
    status: 500,
    code: 'MOCK_ERROR',
    __isAuthError: true,
} as unknown as AuthError);


// --- Supabase Client Initialization ---

let supabaseInstance: SupabaseClient<Database>;

// This self-invoking function robustly initializes either the real or mock client.
// It prevents any initialization error from crashing the entire application.
(() => {
    try {
        // Safely get environment variables
        let url: string | undefined;
        let key: string | undefined;
        if (typeof process !== 'undefined' && typeof process.env === 'object' && process.env !== null) {
            url = process.env.SUPABASE_URL;
            key = process.env.SUPABASE_ANON_KEY;
        }

        // Validate variables. They must exist and be non-empty strings.
        if (!url || !key) {
            throw new Error("Supabase credentials not found or are empty.");
        }
        
        // This is the critical step. Attempt to create the client.
        // If the URL is invalid, createClient() will throw an error which is caught below.
        const realClient = createClient<Database>(url, key);
        
        // If we reach here, the client was created successfully.
        supabaseInstance = realClient;
        
    } catch (error: any) {
        // If ANY error occurs during the try block, we fall back to the mock client.
        console.warn(`Supabase client initialization failed: ${error.message}. Using a mock client to allow the app to load.`);

        // This robust mock client creates a new "thenable" builder for each .from() call,
        // preventing state leakage between different queries and fixing potential crashes.
        const createMockPostgrestBuilder = () => {
            let promise: Promise<{ data: any; error: any; }> = Promise.resolve({ data: [], error: null });

            const builder = {
                select: () => builder,
                insert: (data: any) => {
                    promise = Promise.resolve({ data: [data], error: null });
                    return builder;
                },
                update: () => builder,
                order: () => builder,
                eq: () => builder,
                single: () => {
                    promise = promise.then(res => ({ ...res, data: res.data?.[0] || null }));
                    return builder;
                },
                then: (onFulfilled: any, onRejected: any) => promise.then(onFulfilled, onRejected),
                catch: (onRejected: any) => promise.catch(onRejected),
                finally: (onFinally: any) => promise.finally(onFinally),
            };
            return builder;
        };

        supabaseInstance = {
            from: () => createMockPostgrestBuilder() as any,
            auth: {
                onAuthStateChange: (_callback: any) => ({ data: { subscription: { unsubscribe: () => {} } } }),
                getSession: () => Promise.resolve({ data: { session: null }, error: null }),
                signInWithPassword: () => Promise.resolve({ data: { user: null, session: null }, error: mockError('Supabase no está configurado.') }),
                signUp: () => Promise.resolve({ data: { user: null, session: null }, error: mockError('Supabase no está configurado.') }),
                signOut: () => Promise.resolve({ error: null }),
            },
            functions: {
                invoke: () => Promise.resolve({ data: null, error: { message: 'Supabase no está configurado.' } })
            }
        } as unknown as SupabaseClient<Database>;
    }
})();


export const supabase = supabaseInstance;
