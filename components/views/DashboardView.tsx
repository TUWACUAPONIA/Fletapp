






import React, { useContext, useState, useMemo, useEffect, useRef } from 'react';
import { AppContext } from '../../AppContext';
import { UserRole, Trip, TripStatus, Driver, VehicleType, NewTrip } from '../../types';
import { Button, Input, Card, Icon, Spinner, SkeletonCard } from '../ui';
import { getTripEstimates } from '../../services/geminiService';
import AddressMap from '../AddressMap';
import AutocompleteInput from '../AutocompleteInput';

const SectionHeader: React.FC<{children: React.ReactNode, className?: string, style?: React.CSSProperties}> = ({ children, className, style }) => (
    <h3 className={`text-2xl font-bold mb-4 text-slate-100 border-b-2 border-slate-800/70 pb-2 ${className}`} style={style}>{children}</h3>
);

const CustomerDashboard: React.FC = () => {
  const context = useContext(AppContext);
  const [newTrip, setNewTrip] = useState<Partial<NewTrip>>({});
  const [isCalculating, setIsCalculating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showMap, setShowMap] = useState(false);
  const [editingField, setEditingField] = useState<'origin' | 'destination' | null>(null);

  const customerTrips = useMemo(() => {
    return context?.trips.filter(t => t.customer_id === context.user?.id) || [];
  }, [context?.trips, context?.user?.id]);
  
  useEffect(() => {
      const timer = setTimeout(() => setIsLoading(false), 1200);
      return () => clearTimeout(timer);
  }, [customerTrips.length]);


  const handleCalculate = async () => {
    if (!newTrip.origin || !newTrip.destination || !newTrip.cargo_details) {
      alert("Por favor, ingresa origen, destino y detalles de la carga.");
      return;
    }
    setIsCalculating(true);
    const estimates = await getTripEstimates(newTrip.origin, newTrip.destination, newTrip.cargo_details);
    if (estimates) {
      const { distanceKm, estimatedDriveTimeMin, estimatedLoadTimeMin, estimatedUnloadTimeMin } = estimates;
      const totalMinutes = (estimatedDriveTimeMin || 0) + (estimatedLoadTimeMin || 0) + (estimatedUnloadTimeMin || 0);
      // Pricing logic rounds up to the next full hour.
      const totalHours = Math.ceil(totalMinutes / 60);
      const timeCost = totalHours * 22000;
      const distanceBonus = (distanceKm || 0) > 30 ? 20000 : 0;
      const price = timeCost + distanceBonus;

      setNewTrip(prev => ({ 
          ...prev, 
          distance_km: distanceKm, 
          estimated_drive_time_min: estimatedDriveTimeMin, 
          estimated_load_time_min: estimatedLoadTimeMin, 
          estimated_unload_time_min: estimatedUnloadTimeMin, 
          price: Math.round(price) 
      }));
    } else {
        alert("No se pudo calcular la estimación. Verifique que la clave de API esté configurada correctamente y que los detalles del viaje sean válidos.");
    }
    setIsCalculating(false);
  };
  
  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTrip.origin || !newTrip.destination || !newTrip.cargo_details || !newTrip.estimated_weight_kg || !newTrip.estimated_volume_m3 || !newTrip.price) {
        alert("Por favor, completa y calcula todos los campos del viaje.");
        return;
    }
    setIsLoading(true);
    await context?.createTrip(newTrip as NewTrip);
    setNewTrip({});
  };

  const handleLocationSelect = async (lat: number, lng: number) => {
    if (editingField) {
      // Reverse geocode to get address
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
        const data = await response.json();
        const address = data.display_name || `${lat}, ${lng}`;
        setNewTrip(p => ({ ...p, [editingField]: address }));
      } catch (error) {
        console.error("Error reverse geocoding:", error);
        setNewTrip(p => ({ ...p, [editingField]: `${lat}, ${lng}` }));
      }
    }
    setShowMap(false);
    setEditingField(null);
  };

  const handlePlaceSelected = (field: 'origin' | 'destination', place: google.maps.places.PlaceResult) => {
    const address = place.formatted_address || '';
    setNewTrip(p => ({ ...p, [field]: address }));
  };

  const openMapFor = (field: 'origin' | 'destination') => {
    setEditingField(field);
    setShowMap(true);
  };

  return (
    <div className="grid lg:grid-cols-5 gap-8">
      {showMap && <AddressMap onLocationSelect={handleLocationSelect} onClose={() => setShowMap(false)} />}
      <div className="lg:col-span-2">
          <div className="staggered-child" style={{animationDelay: '0.2s'}}>
            <Card>
                <h3 className="text-2xl font-bold mb-6 text-slate-100">Solicitar un Flete</h3>
                <form onSubmit={handleRequest} className="space-y-5">
                <div className="relative">
                  <AutocompleteInput
                    label="Origen"
                    value={newTrip.origin || ''}
                    onChange={value => setNewTrip(p => ({ ...p, origin: value }))}
                    onPlaceSelected={place => handlePlaceSelected('origin', place)}
                  />
                  <Button type="button" variant="icon" className="absolute right-2 top-9" onClick={() => openMapFor('origin')}><Icon type="mapPin" /></Button>
                </div>
                <div className="relative">
                  <AutocompleteInput
                    label="Destino"
                    value={newTrip.destination || ''}
                    onChange={value => setNewTrip(p => ({ ...p, destination: value }))}
                    onPlaceSelected={place => handlePlaceSelected('destination', place)}
                  />
                  <Button type="button" variant="icon" className="absolute right-2 top-9" onClick={() => openMapFor('destination')}><Icon type="mapPin" /></Button>
                </div>
                <Input label="Detalles de la Carga" name="cargo_details" value={newTrip.cargo_details || ''} onChange={e => setNewTrip(p => ({...p, cargo_details: e.target.value}))} required/>
                <div className="grid grid-cols-2 gap-4">
                    <Input label="Peso Estimado (kg)" name="estimated_weight_kg" type="number" value={newTrip.estimated_weight_kg || ''} onChange={e => setNewTrip(p => ({...p, estimated_weight_kg: Number(e.target.value)}))} required/>
                    <Input label="Volumen Estimado (m³)" name="estimated_volume_m3" type="number" step="0.1" value={newTrip.estimated_volume_m3 || ''} onChange={e => setNewTrip(p => ({...p, estimated_volume_m3: Number(e.target.value)}))} required/>
                </div>
                {newTrip.price ? (
                    <div className="animate-fadeSlideIn">
                      <Card className="bg-slate-950/50 !p-4 border-slate-700/70">
                        <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                            <div>
                                <p className="text-slate-400">Distancia</p>
                                <p className="font-bold text-slate-100">{newTrip.distance_km?.toFixed(1)} km</p>
                            </div>
                            <div>
                                <p className="text-slate-400">Conducción</p>
                                <p className="font-bold text-slate-100">{newTrip.estimated_drive_time_min} min</p>
                            </div>
                            <div>
                                <p className="text-slate-400">Carga Est.</p>
                                <p className="font-bold text-slate-100">{newTrip.estimated_load_time_min} min</p>
                            </div>
                            <div>
                                <p className="text-slate-400">Descarga Est.</p>
                                <p className="font-bold text-slate-100">{newTrip.estimated_unload_time_min} min</p>
                            </div>
                        </div>
                        <p className="font-bold text-xl text-center text-green-400 border-t border-slate-800 pt-3 mt-2">Precio Estimado: ${newTrip.price.toLocaleString()}</p>
                      </Card>
                    </div>
                ) : (
                    <Button type="button" onClick={handleCalculate} isLoading={isCalculating} variant="secondary" className="w-full">Calcular Viaje y Precio (IA)</Button>
                )}
                <Button type="submit" disabled={!newTrip.price || isCalculating} className="w-full !mt-6 !py-3.5">Solicitar Flete</Button>
                </form>
            </Card>
          </div>
      </div>
      <div className="lg:col-span-3">
        <SectionHeader className="staggered-child" style={{animationDelay: '0.3s'}}>Mis Viajes</SectionHeader>
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 mt-4">
            {isLoading ? (
                Array.from({length: 3}).map((_, i) => <SkeletonCard key={i} style={{ animationDelay: `${i * 0.1}s` }}/>)
            ) : customerTrips.length > 0 ? (
                customerTrips.map((trip, index) => <TripCard key={trip.id} trip={trip} animationDelay={`${0.4 + index * 0.05}s`} />)
            ) : (
              <div className="staggered-child" style={{animationDelay: '0.4s'}}>
                <Card><p className="text-center text-slate-400">Aún no has solicitado ningún viaje.</p></Card>
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

const DriverDashboard: React.FC = () => {
  const context = useContext(AppContext);
  const driver = context?.user as Driver;
  const [isLoading, setIsLoading] = useState(true);
  
  const availableTrips = useMemo(() => {
    if (!context || !driver || driver.role !== 'driver') return [];
    
    return context.trips.filter(trip => {
      // A driver must have capacity and vehicle type defined to see trips.
      if (driver.capacity_kg == null || driver.capacity_m3 == null || driver.vehicle_type == null) {
        return false;
      }
      
      const meetsCapacity = trip.estimated_weight_kg <= driver.capacity_kg && trip.estimated_volume_m3 <= driver.capacity_m3;
      
      // Retro-compatibility: if suitable_vehicle_types is not set, show the trip.
      const isVehicleTypeMatch = !trip.suitable_vehicle_types || trip.suitable_vehicle_types.length === 0 || trip.suitable_vehicle_types.includes(driver.vehicle_type);

      return trip.status === 'requested' && meetsCapacity && isVehicleTypeMatch;
    });
  }, [context, driver]);
  
  const prevAvailableTripsCount = useRef(availableTrips.length);

  useEffect(() => {
      // Bell sound for driver when a new trip is available
      if (availableTrips.length > prevAvailableTripsCount.current) {
          const audio = new Audio('https://storage.googleapis.com/gold-dev-web/codelabs/sound-effects/notification-chime.mp3');
          audio.play().catch(e => console.error("Error playing notification sound:", e));
      }
      prevAvailableTripsCount.current = availableTrips.length;
  }, [availableTrips.length]);

  const myTrips = useMemo(() => {
      if (!context || !driver) return [];
      return context.trips.filter(t => t.driver_id === driver.id && (t.status === 'accepted' || t.status === 'in_transit'));
  }, [context, driver]);
  
  const completedTrips = useMemo(() => {
      if (!context || !driver) return [];
      return context.trips.filter(t => t.driver_id === driver.id && (t.status === 'completed' || t.status === 'paid'));
  }, [context, driver]);
  
  useEffect(() => {
      const timer = setTimeout(() => setIsLoading(false), 1000);
      return () => clearTimeout(timer);
  }, []);

  return (
    <div>
        <h2 className="text-3xl font-bold mb-8 text-slate-100 staggered-child" style={{animationDelay: '0.1s'}}>Panel de Fletero</h2>
        <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-10">
                <div>
                    <SectionHeader className="staggered-child" style={{animationDelay: '0.2s'}}>Viajes Disponibles</SectionHeader>
                    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 mt-4">
                        {isLoading ? (
                            Array.from({length: 2}).map((_, i) => <SkeletonCard key={i} style={{ animationDelay: `${i * 0.1}s` }}/>)
                        ) : availableTrips.length > 0 ? (
                            availableTrips.map((trip, index) => <TripCard key={trip.id} trip={trip} animationDelay={`${0.3 + index * 0.05}s`} />)
                        ) : (
                          <div className="staggered-child" style={{animationDelay: '0.3s'}}>
                            <Card><p className="text-center text-slate-400">No hay viajes disponibles que coincidan con tu capacidad y tipo de vehículo.</p></Card>
                          </div>
                        )}
                    </div>
                </div>
                <div>
                    <SectionHeader className="staggered-child" style={{animationDelay: '0.4s'}}>Mis Viajes Completados</SectionHeader>
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 mt-4">
                       {isLoading ? (
                           <SkeletonCard />
                       ) : completedTrips.length > 0 ? (
                           completedTrips.map((trip, index) => <TripCard key={trip.id} trip={trip} animationDelay={`${0.5 + index * 0.05}s`} />)
                       ) : (
                         <div className="staggered-child" style={{animationDelay: '0.5s'}}>
                            <Card><p className="text-center text-slate-400">No has completado ningún viaje.</p></Card>
                         </div>
                       )}
                    </div>
                </div>
            </div>
            <div className="sticky top-24">
                <SectionHeader className="staggered-child" style={{animationDelay: '0.3s'}}>Mis Viajes Activos</SectionHeader>
                 <div className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto pr-2 mt-4">
                    {isLoading ? (
                        <SkeletonCard />
                    ) : myTrips.length > 0 ? (
                        myTrips.map((trip, index) => <TripCard key={trip.id} trip={trip} animationDelay={`${0.4 + index * 0.05}s`} />)
                    ) : (
                      <div className="staggered-child" style={{animationDelay: '0.4s'}}>
                        <Card><p className="text-center text-slate-400">No has aceptado ningún viaje.</p></Card>
                      </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};

const TripCard: React.FC<{ trip: Trip, animationDelay?: string }> = ({ trip, animationDelay = '0s' }) => {
    const context = useContext(AppContext);
    const user = context?.user;
    const [isAccepting, setIsAccepting] = useState(false);
    
    const isLink = user?.role === 'customer' || (user?.role === 'driver' && trip.status !== 'requested');

    const handleClick = () => {
        if (isLink) {
            context?.viewTripDetails(trip.id);
        }
    };

    const handleAccept = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!context) return;
        setIsAccepting(true);
        await context.acceptTrip(trip.id);
        // The component will likely unmount, but this handles cases where it doesn't.
        setIsAccepting(false);
    };
    
    const getStatusChip = (status: TripStatus) => {
        const styles: {[key in TripStatus]: string} = {
            'requested': 'bg-amber-500/10 text-amber-300 border-amber-500/20',
            'accepted': 'bg-blue-500/10 text-blue-300 border-blue-500/20',
            'in_transit': 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20',
            'completed': 'bg-green-500/10 text-green-300 border-green-500/20',
            'paid': 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
        };
        const labels: {[key in TripStatus]: string} = {
            'requested': 'Solicitado',
            'accepted': 'Aceptado',
            'in_transit': 'En Viaje',
            'completed': 'Completado',
            'paid': 'Pagado',
        };
        return <span className={`px-3 py-1 text-xs font-bold rounded-full border ${styles[status]}`}>{labels[status].toUpperCase()}</span>;
    }

    return (
        <div className="staggered-child" style={{animationDelay}}>
            <Card onClick={handleClick} className={`${isLink ? 'cursor-pointer' : ''}`}>
                <div className="flex justify-between items-start">
                    <h4 className="font-bold text-lg text-slate-100 flex-1 mr-4 group-hover:fletapp-text-gradient group-hover:bg-clip-text group-hover:text-transparent transition-colors">{trip.cargo_details}</h4>
                    {getStatusChip(trip.status)}
                </div>
                <p className="text-sm text-slate-400 mt-2">
                    <span className="font-medium text-slate-300">De:</span> {trip.origin} <span className="fletapp-text-gradient font-bold">&rarr;</span> <span className="font-medium text-slate-300">A:</span> {trip.destination}
                </p>
                <div className="border-t border-slate-800 my-4"></div>
                <div className="flex flex-wrap justify-between items-center">
                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-300">
                        <span className="flex items-center gap-1.5"><Icon type="weight" className="w-4 h-4 text-slate-500" /> {trip.estimated_weight_kg} kg</span>
                        <span className="flex items-center gap-1.5"><Icon type="volume" className="w-4 h-4 text-slate-500" /> {trip.estimated_volume_m3} m³</span>
                        {trip.distance_km && <span className="flex items-center gap-1.5"><Icon type="distance" className="w-4 h-4 text-slate-500" /> {trip.distance_km.toFixed(1)} km</span>}
                    </div>
                    <p className="text-xl font-bold text-green-400 mt-2 sm:mt-0">${trip.price?.toLocaleString()}</p>
                </div>
                {user?.role === 'driver' && trip.status === 'requested' && (
                    <div className="mt-4 pt-4 border-t border-slate-800">
                        <Button onClick={handleAccept} className="w-full" isLoading={isAccepting}>Aceptar Viaje</Button>
                    </div>
                )}
            </Card>
        </div>
    );
};


const DashboardView: React.FC = () => {
  const context = useContext(AppContext);
  if (!context || !context.user) return <div className="p-8 text-center flex justify-center"><Spinner/></div>;

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h2 className="text-4xl font-bold mb-2 text-slate-100 staggered-child" style={{animationDelay: '0.1s'}}>Hola, <span className="fletapp-text-gradient bg-gradient-to-r from-amber-300 to-orange-500">{context.user.full_name}!</span></h2>
      <p className="text-slate-400 mb-8 staggered-child" style={{animationDelay: '0.2s'}}>Bienvenido a tu panel de control.</p>
      {context.user.role === 'customer' ? <CustomerDashboard /> : <DriverDashboard />}
    </div>
  );
};

export default DashboardView;
