
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import type { AuthError, Session } from '@supabase/supabase-js';
import { UserRole, View, Driver, Customer, Trip, TripStatus, AnyUser, Profile } from './types';
import HomeView from './components/views/HomeView';
import LandingView from './components/views/LandingView';
import OnboardingView from './components/views/OnboardingView';
import LoginView from './components/views/LoginView';
import DashboardView from './components/views/DashboardView';
import RankingsView from './components/views/RankingsView';
import TripStatusView from './components/views/TripStatusView';
import { getDriverEta } from './services/geminiService';
import { supabase } from './services/supabaseService';
import { Spinner } from './components/ui';

// Define context type to help with inference and avoid deep instantiation errors
export interface AppContextType {
  user: Profile | null;
  users: Profile[];
  trips: Trip[];
  view: View;
  setView: (view: View) => void;
  loginUser: (email: string, password: string) => Promise<AuthError | null>;
  registerUser: (userData: Omit<Profile, 'id'>, password: string) => Promise<AuthError | null>;
  createTrip: (trip: Omit<Trip, 'id' | 'customer_id' | 'driver_id' | 'status'>) => Promise<void>;
  acceptTrip: (tripId: number) => Promise<void>;
  startTrip: (tripId: number) => Promise<void>;
  completeTrip: (tripId: number) => Promise<void>;
  processPayment: (tripId: number) => Promise<void>;
  viewTripDetails: (tripId: number) => void;
  logout: () => Promise<void>;
}

// Context for sharing state
export const AppContext = React.createContext<AppContextType | null>(null);

const App: React.FC = () => {
  const [view, setView] = useState<View>('home');
  const [user, setUser] = useState<Profile | null>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [activeTripId, setActiveTripId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAllData = useCallback(async () => {
    const { data: usersData, error: usersError } = await supabase.from('profiles').select('*');
    if (usersError) console.error('Error fetching users:', usersError);
    else setUsers(usersData);

    const { data: tripsData, error: tripsError } = await supabase.from('trips').select('*').order('created_at', { ascending: false });
    if (tripsError) console.error('Error fetching trips:', tripsError);
    else setTrips(tripsData as Trip[]);
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
        setView('landing');
      } else {
        setUser(profile);
        if (trips.length === 0) { // Fetch data only if not already present
          await fetchAllData();
        }
        setView('dashboard');
      }
    } else {
      setUser(null);
      setUsers([]);
      setTrips([]);
      setView('landing');
    }
    setIsLoading(false);
  }, [fetchAllData, trips.length]);

  useEffect(() => {
    // Check initial session state
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
    // The onAuthStateChange listener will handle setting the state
    setActiveTripId(null);
    setIsLoading(false);
  }, []);

  const loginUser = useCallback(async (email: string, password: string): Promise<AuthError | null> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error;
  }, []);

  const registerUser = useCallback(async (newUser: Omit<Profile, 'id'>, password: string): Promise<AuthError | null> => {
    const { data, error } = await supabase.auth.signUp({ email: newUser.email, password });
    if (error) return error;

    if (data.user) {
        const profileData: Profile = { ...newUser, id: data.user.id };
        const { error: profileError } = await supabase.from('profiles').insert(profileData);
        if (profileError) {
            console.error("Error creating profile:", profileError);
            return { message: profileError.message, name: 'ProfileError' } as AuthError; 
        }
    }
    return null;
  }, []);

  const createTrip = useCallback(async (tripData: Omit<Trip, 'id' | 'customer_id' | 'driver_id' | 'status'>) => {
    if (!user || user.role !== UserRole.CUSTOMER) return;
    const { error } = await supabase.from('trips').insert({
        ...tripData,
        customer_id: user.id,
        status: TripStatus.REQUESTED,
        driver_id: null,
    });
    if (error) console.error("Error creating trip:", error);
    else await fetchAllData();
  }, [user, fetchAllData]);

  const acceptTrip = useCallback(async (tripId: number) => {
    if (!user || user.role !== UserRole.DRIVER) return;
    const driver = user as Driver;
    const tripToAccept = trips.find(t => t.id === tripId);
    if (!tripToAccept) return;
    
    const eta = await getDriverEta(driver.address, tripToAccept.origin);

    const { error } = await supabase.from('trips').update({ 
        status: TripStatus.ACCEPTED, 
        driver_id: user.id,
        driver_arrival_time_min: eta ?? undefined 
    }).eq('id', tripId);

    if (error) console.error("Error accepting trip:", error);
    else await fetchAllData();
  }, [user, trips, fetchAllData]);

  const startTrip = useCallback(async (tripId: number) => {
    if (!user || user.role !== UserRole.DRIVER) return;
    const { error } = await supabase.from('trips').update({ 
        status: TripStatus.IN_TRANSIT, 
        start_time: new Date().toISOString() 
    }).eq('id', tripId);
    
    if (error) console.error("Error starting trip:", error);
    else await fetchAllData();
  }, [user, fetchAllData]);

  const completeTrip = useCallback(async (tripId: number) => {
    if (!user || user.role !== UserRole.DRIVER) return;
    const trip = trips.find(t => t.id === tripId);
    if (trip && trip.status === TripStatus.IN_TRANSIT && trip.start_time) {
        const startTimeMs = new Date(trip.start_time).getTime();
        const finalDurationMin = Math.ceil((Date.now() - startTimeMs) / (1000 * 60));
        
        const totalHours = Math.ceil(finalDurationMin / 60);
        const timeCost = totalHours * 22000;
        const distanceBonus = (trip.distance_km || 0) > 30 ? 20000 : 0;
        const finalPrice = timeCost + distanceBonus;

        const { error } = await supabase.from('trips').update({ 
            status: TripStatus.COMPLETED, 
            final_duration_min: finalDurationMin, 
            final_price: Math.round(finalPrice) 
        }).eq('id', tripId);

        if (error) console.error("Error completing trip:", error);
        else await fetchAllData();
    }
  }, [user, trips, fetchAllData]);

  const processPayment = useCallback(async (tripId: number) => {
    const { error } = await supabase.from('trips').update({ status: TripStatus.PAID }).eq('id', tripId);
    if (error) console.error("Error processing payment:", error);
    else await fetchAllData();
  }, [fetchAllData]);

  const viewTripDetails = useCallback((tripId: number) => {
    setActiveTripId(tripId);
    setView('tripStatus');
  }, []);

  const appContextValue: AppContextType | null = useMemo(() => ({
    user,
    users,
    trips,
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
    logout,
  }), [user, users, trips, view, loginUser, registerUser, createTrip, acceptTrip, startTrip, completeTrip, processPayment, viewTripDetails, logout]);

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
