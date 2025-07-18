



import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { AuthError, Session } from '@supabase/supabase-js';
import { UserRole, View, Driver, Customer, Trip, TripStatus, Profile, VehicleType, NewTrip, Review } from './types';
import HomeView from './components/views/HomeView';
import LandingView from './components/views/LandingView';
import OnboardingView from './components/views/OnboardingView';
import LoginView from './components/views/LoginView';
import DashboardView from './components/views/DashboardView';
import RankingsView from './components/views/RankingsView';
import TripStatusView from './components/views/TripStatusView';
import DriverProfileView from './components/views/DriverProfileView';
import { getDriverEta, getSuitableVehicleTypes } from './services/geminiService';
import { supabase, type Database } from './services/supabaseService';
import { Spinner } from './components/ui';
import { AppContext, AppContextType } from './AppContext';


const App: React.FC = () => {
  const [view, setView] = useState<View>('home');
  const [user, setUser] = useState<Profile | null>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [activeTripId, setActiveTripId] = useState<number | null>(null);
  const [activeDriverId, setActiveDriverId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const prevTripsRef = useRef<Trip[]>([]);
  const userRef = useRef(user); // Create a ref to hold the user state.
  const tripsRef = useRef(trips); // Create a ref to hold the trips state.

  // Keep the refs updated whenever the state changes.
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    tripsRef.current = trips;
  }, [trips]);

  useEffect(() => {
    // Horn sound for client when a trip is accepted
    if (user?.role === 'customer' && prevTripsRef.current.length > 0) {
        trips.forEach(newTrip => {
            const oldTrip = prevTripsRef.current.find(t => t.id === newTrip.id);
            if (oldTrip && oldTrip.status === 'requested' && newTrip.status === 'accepted' && newTrip.customer_id === user.id) {
                const audio = new Audio('https://storage.googleapis.com/interactive-media-ads/media/bus-horn.mp3');
                audio.play().catch(e => console.error("Error playing horn sound:", e));
            }
        });
    }
    // Update the ref for the next render
    prevTripsRef.current = trips;
  }, [trips, user]);

  const fetchAllData = useCallback(async () => {
    const { data: usersData, error: usersError } = await supabase.from('profiles').select('*');
    if (usersError) console.error('Error fetching users:', usersError);
    else setUsers(usersData || []);

    const { data: tripsData, error: tripsError } = await supabase.from('trips').select('*').order('created_at', { ascending: false });
    if (tripsError) console.error('Error fetching trips:', tripsError);
    else setTrips(tripsData || []);

    const { data: reviewsData, error: reviewsError } = await supabase.from('reviews').select('*').order('created_at', { ascending: false });
    if (reviewsError) console.error('Error fetching reviews:', reviewsError);
    else setReviews(reviewsData || []);
  }, []);
  
  const handleSession = useCallback(async (session: Session | null) => {
    if (session?.user) {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

        if (error) {
            console.error('Error fetching profile:', error);
            setUser(null);
        } else {
            // Use the userRef to check for a new login, breaking the dependency cycle.
            const isNewLogin = !userRef.current || userRef.current.id !== (profile?.id || '');
            setUser(profile || null);
            if (isNewLogin) { // Fetch all data only on a new login.
                await fetchAllData();
            }
        }
    } else {
        setUser(null);
        setUsers([]);
        setTrips([]);
        setReviews([]);
    }
  }, [fetchAllData]);

  useEffect(() => {
    // Check initial session state in the background without showing a loader
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    });

    // Set up listener for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        handleSession(session);
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, [handleSession]);

  const logout = useCallback(async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error logging out:', error);
      alert('Error al cerrar sesión.');
    }
    // The onAuthStateChange listener will handle setting the user state.
    // The view will change to LoginView automatically because user becomes null.
    setActiveTripId(null);
    setActiveDriverId(null);
    setView('landing'); // Redirect to landing after logout
    setIsLoading(false);
  }, []);

  const loginUser = useCallback(async (email: string, password: string): Promise<AuthError | null> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error;
  }, []);

  const registerUser = useCallback(async (newUser: Omit<Database['public']['Tables']['profiles']['Insert'], 'id'>, password: string): Promise<AuthError | null> => {
    const { error } = await supabase.auth.signUp({
        email: newUser.email,
        password: password,
        options: {
            data: newUser // Pass all other profile data here
        }
    });
    
    if (error) {
        console.error("Error signing up:", error);
    }

    return error;
  }, []);

  const createTrip = useCallback(async (tripData: NewTrip) => {
    const currentUser = userRef.current;
    if (!currentUser || currentUser.role !== 'customer') return;
    
    // AI call to determine suitable vehicle types
    const suitableTypes = await getSuitableVehicleTypes(tripData.cargo_details);
    // Fallback: If AI fails, allow all vehicle types to see the trip to not block the user.
    const vehicleTypeValues: VehicleType[] = ['Furgoneta', 'Furgón', 'Pick UP', 'Camión ligero', 'Camión pesado'];
    const suitable_vehicle_types = suitableTypes ?? vehicleTypeValues;

    const tripToInsert: Database['public']['Tables']['trips']['Insert'] = {
        ...tripData,
        customer_id: currentUser.id,
        status: 'requested',
        driver_id: null,
        suitable_vehicle_types: suitable_vehicle_types,
    };

    const { error } = await supabase.from('trips').insert([tripToInsert]);
    if (error) console.error("Error creating trip:", error);
    else await fetchAllData();
  }, [fetchAllData]);

  const acceptTrip = useCallback(async (tripId: number) => {
    const currentUser = userRef.current;
    if (!currentUser || currentUser.role !== 'driver') return;
    const driver = currentUser as Profile as Driver; // Casting because we know the role
    const tripToAccept = tripsRef.current.find(t => t.id === tripId);
    if (!tripToAccept) return;
    
    const eta = await getDriverEta(driver.address, tripToAccept.origin);

    const updatePayload: Database['public']['Tables']['trips']['Update'] = { 
        status: 'accepted', 
        driver_id: currentUser.id,
        driver_arrival_time_min: eta
    };

    const { error } = await supabase.from('trips').update(updatePayload).eq('id', tripId);

    if (error) console.error("Error accepting trip:", error);
    else await fetchAllData();
  }, [fetchAllData]);

  const startTrip = useCallback(async (tripId: number) => {
    const currentUser = userRef.current;
    if (!currentUser || currentUser.role !== 'driver') return;

    const updatePayload: Database['public']['Tables']['trips']['Update'] = { 
        status: 'in_transit', 
        start_time: new Date().toISOString() 
    };

    const { error } = await supabase.from('trips').update(updatePayload).eq('id', tripId);
    
    if (error) console.error("Error starting trip:", error);
    else await fetchAllData();
  }, [fetchAllData]);

  const completeTrip = useCallback(async (tripId: number) => {
    const trip = tripsRef.current.find(t => t.id === tripId);
    if (trip && trip.status === 'in_transit' && trip.start_time) {
        const startTimeMs = new Date(trip.start_time).getTime();
        const finalDurationMin = Math.ceil((Date.now() - startTimeMs) / (1000 * 60));
        
        const totalHours = Math.ceil(finalDurationMin / 60);
        const timeCost = totalHours * 22000;
        const distanceBonus = (trip.distance_km || 0) > 30 ? 20000 : 0;
        const finalPrice = timeCost + distanceBonus;

        const updatePayload: Database['public']['Tables']['trips']['Update'] = { 
            status: 'completed', 
            final_duration_min: finalDurationMin, 
            final_price: Math.round(finalPrice) 
        };
        const { error } = await supabase.from('trips').update(updatePayload).eq('id', tripId);

        if (error) console.error("Error completing trip:", error);
        else await fetchAllData();
    }
  }, [fetchAllData]);

  const processPayment = useCallback(async (tripId: number) => {
    const updatePayload: Database['public']['Tables']['trips']['Update'] = { status: 'paid' };
    const { error } = await supabase.from('trips').update(updatePayload).eq('id', tripId);
    if (error) console.error("Error processing payment:", error);
    else await fetchAllData();
  }, [fetchAllData]);

  const sendChatMessage = useCallback(async (tripId: number, content: string) => {
    const currentUser = userRef.current;
    if (!currentUser) return;
    const messageToInsert: Database['public']['Tables']['chat_messages']['Insert'] = {
      trip_id: tripId,
      sender_id: currentUser.id,
      content: content,
    };
    const { error } = await supabase.from('chat_messages').insert([messageToInsert]);
    if (error) {
      console.error("Error sending chat message:", error);
    }
  }, []);

  const submitReview = useCallback(async (tripId: number, driverId: string, rating: number, comment: string) => {
    const currentUser = userRef.current;
    if (!currentUser || currentUser.role !== 'customer') return;
    const reviewToInsert: Database['public']['Tables']['reviews']['Insert'] = {
        trip_id: tripId,
        reviewer_id: currentUser.id,
        driver_id: driverId,
        rating,
        comment,
    };
    const { error } = await supabase.from('reviews').insert([reviewToInsert]);
    if (error) {
      console.error("Error submitting review:", error);
      alert('Error al enviar la reseña.');
    } else {
      await fetchAllData(); // Refresh reviews
    }
  }, [fetchAllData]);

  const viewTripDetails = useCallback((tripId: number) => {
    setActiveTripId(tripId);
    setView('tripStatus');
  }, []);
  
  const viewDriverProfile = useCallback((driverId: string) => {
    setActiveDriverId(driverId);
    setView('driverProfile');
  }, []);

  const appContextValue: AppContextType | null = useMemo(() => ({
    user,
    users,
    trips,
    reviews,
    view,
    setView,
    loginUser,
    registerUser,
    createTrip,
    acceptTrip,
    startTrip,
    completeTrip,
    processPayment,
    viewTripDetails,
    sendChatMessage,
    submitReview,
    viewDriverProfile,
    logout,
    activeDriverId,
  }), [user, users, trips, reviews, view, setView, loginUser, registerUser, createTrip, acceptTrip, startTrip, completeTrip, processPayment, viewTripDetails, sendChatMessage, submitReview, viewDriverProfile, logout, activeDriverId]);

  const Header = () => {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
      const handleScroll = () => {
        setScrolled(window.scrollY > 10);
      };
      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }, []);
    
    const showHeader = !['home'].includes(view) && !isLoading;
    if (!showHeader) return null;

    return (
    <header className={`p-4 sticky top-0 z-40 transition-all duration-300 ${scrolled ? 'bg-slate-950/80 backdrop-blur-lg border-b border-slate-800/50' : 'bg-transparent border-b border-transparent'}`}>
      <nav className="container mx-auto flex justify-between items-center">
        <div 
          className="text-2xl font-bold cursor-pointer fletapp-text-gradient bg-clip-text text-transparent bg-gradient-to-r from-amber-300 to-orange-500"
          onClick={() => setView(user ? 'dashboard' : 'home')}>
            Fletapp
        </div>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <button onClick={() => setView('dashboard')} className={`px-4 py-2 rounded-md transition-colors font-medium ${view === 'dashboard' ? 'text-white bg-slate-800/50' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'}`}>Dashboard</button>
              <button onClick={() => setView('rankings')} className={`px-4 py-2 rounded-md transition-colors font-medium ${view === 'rankings' ? 'text-white bg-slate-800/50' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'}`}>Rankings</button>
              <button 
                onClick={logout} 
                className="px-4 py-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-md transition-colors font-medium"
              >
                Cerrar Sesión
              </button>
            </>
          ) : view === 'login' ? (
             <button onClick={() => setView('onboarding')} className="px-4 py-2 rounded-md transition-colors font-medium text-slate-300 hover:text-white hover:bg-slate-800/50">Crear Cuenta</button>
          ) : view === 'onboarding' ? (
             <button onClick={() => setView('login')} className="px-4 py-2 rounded-md transition-colors font-medium text-slate-300 hover:text-white hover:bg-slate-800/50">Iniciar Sesión</button>
          ) : null}
        </div>
      </nav>
    </header>
  )};
  
  const renderView = () => {
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Spinner />
            </div>
        );
    }
    switch (view) {
      case 'home':
        return <HomeView />;
      case 'landing':
        return <LandingView />;
      case 'onboarding':
        return <OnboardingView />;
      case 'login':
        return <LoginView />;
      case 'dashboard':
        return user ? <DashboardView /> : <LoginView />;
      case 'rankings':
        return user ? <RankingsView /> : <LoginView />;
      case 'tripStatus':
        return activeTripId && user ? <TripStatusView tripId={activeTripId} /> : <DashboardView />;
      case 'driverProfile':
        return activeDriverId && user ? <DriverProfileView /> : <RankingsView />;
      default:
        return <HomeView />;
    }
  };

  return (
    <AppContext.Provider value={appContextValue}>
      <div className="min-h-screen bg-transparent">
        <Header />
        <main>
          <div key={view} className="animate-fadeSlideIn">
            {renderView()}
          </div>
        </main>
      </div>
    </AppContext.Provider>
  );
};

export default App;
