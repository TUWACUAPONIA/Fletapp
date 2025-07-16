



import React, { useContext, useMemo, useState, useEffect, useRef } from 'react';
import { AppContext } from '../../AppContext';
import { Trip, TripStatus, UserRole, View, Profile, ChatMessage, Review } from '../../types';
import { Button, Card, Icon, Spinner, Input, StarRating, TextArea } from '../ui';
import { supabase } from '../../services/supabaseService';

interface TripStatusViewProps {
  tripId: number;
}

const ReviewForm: React.FC<{ trip: Trip }> = ({ trip }) => {
    const context = useContext(AppContext);
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    if (!context || !trip.driver_id) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (rating === 0) {
            alert('Por favor, selecciona una calificación de estrellas.');
            return;
        }
        setIsLoading(true);
        await context.submitReview(trip.id, trip.driver_id!, rating, comment);
        setIsLoading(false);
    };

    return (
        <Card>
            <h3 className="text-xl font-bold mb-4 text-slate-100">Califica tu Experiencia</h3>
            <p className="text-slate-400 mb-4">Tu opinión ayuda a otros clientes. ¿Cómo fue tu experiencia con {trip.driver_id && context.users.find(u => u.id === trip.driver_id)?.full_name}?</p>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex justify-center">
                    <StarRating value={rating} onChange={setRating} isEditable size="lg" />
                </div>
                <TextArea
                    label="Comentario (opcional)"
                    id="review-comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Describe tu experiencia..."
                />
                <Button type="submit" isLoading={isLoading} className="w-full">Enviar Reseña</Button>
            </form>
        </Card>
    );
};


const Stopwatch: React.FC<{ start_time: number | string }> = ({ start_time }) => {
    const [elapsed, setElapsed] = useState(Date.now() - new Date(start_time).getTime());

    useEffect(() => {
        const interval = setInterval(() => {
            setElapsed(Date.now() - new Date(start_time).getTime());
        }, 1000);
        return () => clearInterval(interval);
    }, [start_time]);

    const formatTime = (ms: number) => {
        const totalSeconds = Math.floor(ms / 1000);
        const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
        const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
        const seconds = String(totalSeconds % 60).padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    };

    return (
        <div className="text-center p-4 bg-indigo-500/10 rounded-lg border border-indigo-500/20 animate-fadeSlideIn">
            <p className="font-bold text-indigo-300 text-lg">Tiempo de Viaje Transcurrido</p>
            <p className="text-4xl font-mono font-bold text-white tracking-wider mt-2">{formatTime(elapsed)}</p>
        </div>
    );
};

const MercadoPagoQrModal: React.FC<{ trip: Trip; onClose: () => void; onPaymentSuccess: (tripId: number) => void }> = ({ trip, onClose, onPaymentSuccess }) => {
    const [paymentStatus, setPaymentStatus] = useState<'scanning' | 'processing' | 'success'>('scanning');

    useEffect(() => {
        let timer: number;
        if (paymentStatus === 'scanning') {
            timer = window.setTimeout(() => setPaymentStatus('processing'), 3000);
        } else if (paymentStatus === 'processing') {
            timer = window.setTimeout(() => setPaymentStatus('success'), 2000);
        } else if (paymentStatus === 'success') {
            timer = window.setTimeout(() => {
                onPaymentSuccess(trip.id);
                onClose();
            }, 1500);
        }
        return () => clearTimeout(timer);
    }, [paymentStatus, onClose, onPaymentSuccess, trip.id]);

    const content = {
        scanning: {
            icon: <Icon type="qrCode" className="w-48 h-48 text-slate-300" />,
            title: "Escanea para pagar con MercadoPago",
            description: `Abre tu app de MercadoPago y escanea el código para pagar $${trip.final_price?.toLocaleString()}.`
        },
        processing: {
            icon: <Spinner />,
            title: "Procesando pago...",
            description: "Aguarde un momento, estamos confirmando la transacción."
        },
        success: {
            icon: <Icon type="checkCircle" className="w-24 h-24 text-green-400" />,
            title: "¡Pago Aprobado!",
            description: "Gracias por tu pago. El viaje ha sido finalizado."
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeSlideIn" style={{animationDuration: '0.3s'}} onClick={onClose}>
            <Card className="w-full max-w-md text-center" onClick={e => e.stopPropagation()}>
                <div className={`transition-all duration-500 ease-in-out flex flex-col items-center justify-center min-h-[320px] ${paymentStatus === 'scanning' ? 'opacity-100 scale-100' : 'opacity-0 scale-95 absolute invisible'}`}>
                    <div className="flex justify-center mb-6">{content.scanning.icon}</div>
                    <h3 className="text-2xl font-bold mb-2 text-slate-100">{content.scanning.title}</h3>
                    <p className="text-slate-400">{content.scanning.description}</p>
                </div>
                <div className={`transition-all duration-500 ease-in-out flex flex-col items-center justify-center min-h-[320px] ${paymentStatus === 'processing' ? 'opacity-100 scale-100' : 'opacity-0 scale-95 absolute invisible'}`}>
                    <div className="mb-6">{content.processing.icon}</div>
                    <h3 className="text-2xl font-bold mb-2 text-slate-100">{content.processing.title}</h3>
                    <p className="text-slate-400">{content.processing.description}</p>
                </div>
                 <div className={`transition-all duration-500 ease-in-out flex flex-col items-center justify-center min-h-[320px] ${paymentStatus === 'success' ? 'opacity-100 scale-100' : 'opacity-0 scale-95 absolute invisible'}`}>
                    <div className="mb-4">{content.success.icon}</div>
                    <h3 className="text-2xl font-bold mb-2 text-slate-100">{content.success.title}</h3>
                    <p className="text-slate-400">{content.success.description}</p>
                </div>
            </Card>
        </div>
    );
};


const PaymentModal: React.FC<{ trip: Trip; onClose: () => void; onPaymentSuccess: (tripId: number) => void; onShowQr: () => void; }> = ({ trip, onClose, onPaymentSuccess, onShowQr }) => {
    const [isLoading, setIsLoading] = useState(false);

    const handleCardPayment = async () => {
        setIsLoading(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));
        await onPaymentSuccess(trip.id);
        setIsLoading(false);
        onClose();
    };
    
    return (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeSlideIn" style={{animationDuration: '0.3s'}}>
            <Card className="w-full max-w-lg relative" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white">&times;</button>
                <h3 className="text-2xl font-bold mb-2 text-slate-100">Realizar Pago</h3>
                <p className="text-slate-400 mb-6">Estás a punto de pagar por el flete de <span className="font-semibold text-slate-300">{trip.cargo_details}</span>.</p>
                <div className="bg-slate-950/50 p-6 rounded-xl border border-slate-800 mb-6">
                    <p className="text-sm text-slate-300 text-center">MONTO FINAL A PAGAR</p>
                    <p className="text-5xl font-bold text-center text-green-400 mt-2">${trip.final_price?.toLocaleString()}</p>
                </div>
                
                <div className="space-y-4">
                    <fieldset className="border border-slate-700 p-4 rounded-lg">
                        <legend className="px-2 text-slate-400 font-semibold">Tarjeta de Crédito/Débito</legend>
                        <div className="space-y-4 mt-2">
                             <Input label="Número de Tarjeta" id="cc-number" placeholder="0000 0000 0000 0000" />
                             <div className="grid grid-cols-2 gap-4">
                                <Input label="Vencimiento" id="cc-expiry" placeholder="MM/YY" />
                                <Input label="CVC" id="cc-cvc" placeholder="123" />
                             </div>
                        </div>
                    </fieldset>

                    <Button onClick={handleCardPayment} isLoading={isLoading} className="w-full !py-4">
                        <Icon type="creditCard" className="w-6 h-6" />Pagar ${trip.final_price?.toLocaleString()}
                    </Button>
                    
                    <div className="flex items-center my-4">
                        <div className="flex-grow border-t border-slate-700"></div>
                        <span className="flex-shrink mx-4 text-slate-500">O</span>
                        <div className="flex-grow border-t border-slate-700"></div>
                    </div>
                    
                     <Button variant="secondary" onClick={onShowQr} className="w-full bg-sky-600/80 hover:bg-sky-500/80 text-white border-sky-500/50">
                        <Icon type="mercadoPago" className="w-6 h-6" /> Pagar con MercadoPago
                    </Button>
                </div>
            </Card>
        </div>
    )
};

const MapDisplay: React.FC<{ trip: Trip }> = ({ trip }) => {
    const apiKey = useMemo(() => {
        try {
            // This robust check prevents crashes in sandboxed or unusual environments.
            // It verifies each object in the chain before attempting access.
            if (typeof process !== 'undefined' && typeof process.env === 'object' && process.env !== null && Object.prototype.hasOwnProperty.call(process.env, 'API_KEY')) {
                return process.env.API_KEY;
            }
        } catch (e) {
            // In case of any error (e.g., security restrictions), fall through gracefully.
            console.warn("Could not access process.env.API_KEY", e);
        }
        return undefined;
    }, []);
    
    const mapEmbedUrl = apiKey ? `https://www.google.com/maps/embed/v1/directions?key=${apiKey}&origin=${encodeURIComponent(trip.origin)}&destination=${encodeURIComponent(trip.destination)}` : '';

    return (
        <div className="mt-4 aspect-video bg-slate-900/50 rounded-lg overflow-hidden border border-slate-700 relative group">
            {apiKey ? (
                <iframe
                    title="Recorrido del Viaje"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                    src={mapEmbedUrl}
                ></iframe>
            ) : (
                <div className="w-full h-full bg-slate-800/80"></div>
            )}
            
            <div className={`
              absolute inset-0 flex flex-col items-center justify-center p-4 text-center 
              transition-all duration-300 backdrop-blur-sm
              ${apiKey 
                ? 'bg-slate-900/80 opacity-0 group-hover:opacity-100 focus-within:opacity-100' 
                : 'bg-slate-800/80 opacity-100'
              }
            `}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-amber-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h4 className="font-bold text-slate-100 text-lg mb-1">
                  {apiKey ? "¿Problemas para ver el mapa?" : "Mapa no disponible"}
                </h4>
                <p className="text-slate-300 text-sm max-w-sm">
                  Para que el mapa funcione, tu clave de API debe estar habilitada para el servicio <strong>"Maps Embed API"</strong> en tu proyecto de Google Cloud y tener una cuenta de facturación activa.
                </p>
                 {!apiKey && <p className="text-amber-300/80 text-xs mt-3">La API Key no está configurada en el entorno.</p>}
            </div>
        </div>
    );
};

const ChatComponent: React.FC<{ tripId: number }> = ({ tripId }) => {
    const context = useContext(AppContext);
    const user = context?.user;
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        const fetchMessages = async () => {
            setIsLoading(true);
            const { data, error } = await supabase
                .from('chat_messages')
                .select('*')
                .eq('trip_id', tripId)
                .order('created_at', { ascending: true });
            
            if (error) {
                console.error('Error fetching messages:', error);
            } else {
                setMessages(data || []);
            }
            setIsLoading(false);
        };
        fetchMessages();

        const channel = supabase.channel(`chat_trip_${tripId}`)
            .on<ChatMessage>(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `trip_id=eq.${tripId}` },
                (payload) => {
                    setMessages((prevMessages) => [...prevMessages, payload.new as ChatMessage]);
                }
            )
            .subscribe();
            
        return () => {
            supabase.removeChannel(channel);
        };
    }, [tripId]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !context || isSending) return;

        setIsSending(true);
        await context.sendChatMessage(tripId, newMessage.trim());
        setNewMessage('');
        setIsSending(false);
    };
    
    if (!user) return null;

    return (
        <Card>
            <h3 className="text-xl font-bold mb-4 text-slate-100">Chat del Viaje</h3>
            <div className="h-80 bg-slate-950/50 rounded-lg p-4 flex flex-col space-y-4 overflow-y-auto border border-slate-800">
                {isLoading ? (
                    <div className="flex-1 flex items-center justify-center"><Spinner /></div>
                ) : messages.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-slate-500">Aún no hay mensajes.</div>
                ) : (
                    messages.map(msg => {
                        const isSender = msg.sender_id === user.id;
                        return (
                            <div key={msg.id} className={`flex flex-col ${isSender ? 'items-end' : 'items-start'}`}>
                                <div className={`max-w-xs md:max-w-md px-4 py-2 rounded-xl ${isSender ? 'bg-amber-600/80 text-white rounded-br-none' : 'bg-slate-700 text-slate-200 rounded-bl-none'}`}>
                                    <p>{msg.content}</p>
                                </div>
                                <span className="text-xs text-slate-500 mt-1 px-1">
                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="mt-4 flex gap-2">
                <Input
                    id="chat-message"
                    name="chat-message"
                    placeholder="Escribe un mensaje..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-grow"
                    disabled={isSending}
                    autoComplete="off"
                />
                <Button type="submit" isLoading={isSending} disabled={!newMessage.trim()}>Enviar</Button>
            </form>
        </Card>
    );
};


const TripStatusView: React.FC<TripStatusViewProps> = ({ tripId }) => {
  const context = useContext(AppContext);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  
  const trip = useMemo(() => context?.trips.find(t => t.id === tripId), [context?.trips, tripId]);
  const driver = useMemo(() => {
    if (!context || !trip?.driver_id) return null;
    return context.users.find(d => d.id === trip.driver_id);
  }, [context?.users, trip]);
  
  const user = context?.user;
  const hasAlreadyReviewed = useMemo(() => {
      return context?.reviews.some(r => r.trip_id === tripId && r.reviewer_id === user?.id);
  }, [context?.reviews, tripId, user?.id]);
  
  const ADMIN_PAYMENT_INFO = 'fletapp.admin.mp';

  if (!context) return <div className="p-8 text-center flex justify-center"><Spinner/></div>;

  if (!trip) {
    return (
      <div className="container mx-auto p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Viaje no encontrado</h2>
        <p className="text-slate-400 mb-6">El viaje que buscas no existe o fue eliminado.</p>
        <Button onClick={() => context.setView('dashboard' as View)}>Volver al Panel</Button>
      </div>
    );
  }
  
  const handleBack = () => context.setView('dashboard' as View);
  
  const handleStartTrip = async () => await context.startTrip(trip.id);
  const handleCompleteTrip = async () => await context.completeTrip(trip.id);
  const handlePayment = async (id: number) => await context.processPayment(id);
  
  const statuses = [
      { key: 'requested' as TripStatus, label: 'Solicitado' },
      { key: 'accepted' as TripStatus, label: 'Aceptado por Fletero' },
      { key: 'in_transit' as TripStatus, label: 'En Viaje' },
      { key: 'completed' as TripStatus, label: 'Entregado' },
      { key: 'paid' as TripStatus, label: 'Pagado y Finalizado' },
  ];
  
  const currentStatusIndex = statuses.findIndex(s => s.key === trip.status);

  const progressHeight = currentStatusIndex > 0 ? `${(currentStatusIndex / (statuses.length - 1)) * 100}%` : '0%';
  
  const showReviewForm = user?.role === 'customer' && trip.status === 'paid' && !hasAlreadyReviewed;
  const showReviewSubmitted = user?.role === 'customer' && trip.status === 'paid' && hasAlreadyReviewed;

  return (
    <>
    {isPaymentModalOpen && <PaymentModal trip={trip} onClose={() => setIsPaymentModalOpen(false)} onPaymentSuccess={handlePayment} onShowQr={() => { setIsPaymentModalOpen(false); setIsQrModalOpen(true); }} />}
    {isQrModalOpen && <MercadoPagoQrModal trip={trip} onClose={() => setIsQrModalOpen(false)} onPaymentSuccess={handlePayment} />}

    <div className="container mx-auto p-4 md:p-8">
      <button onClick={handleBack} className="flex items-center gap-2 text-slate-300 hover:text-white transition mb-6 font-semibold staggered-child">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
        Volver al Panel
      </button>
      <div className="grid lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-8">
            <div className="staggered-child" style={{ animationDelay: '0.1s' }}><Card>
                <div className="flex justify-between items-start gap-4">
                    <h3 className="text-2xl font-bold text-slate-100 flex-1">{trip.cargo_details}</h3>
                    <div className="text-right">
                        <p className="text-2xl font-bold text-green-400 whitespace-nowrap">
                            ${(trip.final_price ?? trip.price)?.toLocaleString()}
                        </p>
                        <span className={`text-xs font-semibold uppercase ${trip.final_price ? 'text-green-400' : 'text-amber-400'}`}>
                            {trip.final_price ? 'Precio Final' : 'Precio Estimado'}
                        </span>
                    </div>
                </div>
                {trip.status === 'completed' && trip.final_price && <p className="text-sm text-slate-400 mt-1">Calculado en base a la duración y distancia del viaje.</p>}
                
                <div className="mt-4 space-y-2 text-slate-300">
                    <p><span className="font-semibold text-slate-100">Origen:</span> {trip.origin}</p>
                    <p><span className="font-semibold text-slate-100">Destino:</span> {trip.destination}</p>
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm mt-4 text-slate-300 border-t border-slate-800 pt-4">
                    <span className="flex items-center gap-2" title="Distancia"><Icon type="distance" className="w-5 h-5 text-slate-400" /> {trip.distance_km?.toFixed(1)} km</span>
                    {trip.final_duration_min ? 
                       <span className="flex items-center gap-2" title="Duración Final"><Icon type="time" className="w-5 h-5 text-slate-400" /> {trip.final_duration_min} min</span> :
                       (trip.estimated_drive_time_min || trip.estimated_load_time_min || trip.estimated_unload_time_min) &&
                         <span className="flex items-center gap-2" title="Tiempo Total Estimado (Conducción + Carga + Descarga)">
                            <Icon type="time" className="w-5 h-5 text-slate-400" /> 
                            {(trip.estimated_drive_time_min || 0) + (trip.estimated_load_time_min || 0) + (trip.estimated_unload_time_min || 0)} min (Est.)
                         </span>
                    }
                    <span className="flex items-center gap-2" title="Peso"><Icon type="weight" className="w-5 h-5 text-slate-400" /> {trip.estimated_weight_kg} kg</span>
                    <span className="flex items-center gap-2" title="Volumen"><Icon type="volume" className="w-5 h-5 text-slate-400" /> {trip.estimated_volume_m3} m³</span>
                </div>
                 { driver && (
                    <div className="mt-6 border-t border-slate-800 pt-4 animate-fadeSlideIn">
                        <h4 className="font-bold text-lg text-slate-200 mb-3">Fletero Asignado</h4>
                        <div className="flex items-center gap-4">
                            <img src={driver.photo_url} alt={driver.full_name} className="w-16 h-16 rounded-full object-cover bg-slate-700 border-2 border-slate-700"/>
                            <div>
                                <p className="font-bold text-xl text-white">{driver.full_name}</p>
                                <p className="text-sm text-slate-400">{driver.vehicle}</p>
                                <p className="text-sm text-slate-400">Tel: {driver.phone}</p>
                            </div>
                        </div>
                    </div>
                )}
            </Card></div>
            
            <div className="staggered-child" style={{ animationDelay: '0.2s' }}><Card>
                <h3 className="text-2xl font-bold mb-4 text-slate-100">Recorrido del Viaje</h3>
                <MapDisplay trip={trip} />
            </Card></div>

            {trip.status !== 'requested' && trip.status !== 'paid' && (
              <div className="staggered-child" style={{ animationDelay: '0.4s' }}>
                <ChatComponent tripId={trip.id} />
              </div>
            )}
            
            {showReviewForm && (
                <div className="staggered-child lg:col-span-2" style={{ animationDelay: '0.4s' }}>
                    <ReviewForm trip={trip} />
                </div>
            )}
            
            {showReviewSubmitted && (
                <div className="staggered-child lg:col-span-2" style={{ animationDelay: '0.4s' }}>
                    <Card className="text-center">
                        <Icon type="checkCircle" className="w-12 h-12 text-green-400 mx-auto mb-4" />
                        <h3 className="text-xl font-bold mb-2 text-slate-100">Reseña Enviada</h3>
                        <p className="text-slate-400">Gracias por compartir tu opinión.</p>
                    </Card>
                </div>
            )}
        </div>
        
        <div className="lg:col-span-1 sticky top-24">
            <div className="staggered-child" style={{ animationDelay: '0.3s' }}><Card>
                <h3 className="text-xl font-bold mb-8 text-slate-100">Estado del Viaje</h3>
                <div className="relative border-l-2 border-slate-700 ml-4">
                    <div className="absolute top-0 -left-px w-0.5 fletapp-gold-gradient transition-all duration-1000 ease-out" style={{height: progressHeight}}></div>
                    {statuses.map((status, index) => {
                        const isActive = index <= currentStatusIndex;
                        const isCurrent = index === currentStatusIndex;
                        return (
                            <div key={status.key} className="relative mb-10 pl-10">
                                <div className={`absolute -left-[13px] top-1 w-6 h-6 rounded-full border-4 border-slate-950 transition-all duration-500 ${isActive ? 'fletapp-gold-gradient' : 'bg-slate-600'}`}>
                                    {isCurrent && <div className="absolute inset-0 rounded-full fletapp-gold-gradient animate-pulse"></div>}
                                </div>
                                <p className={`font-bold transition-colors duration-500 text-lg ${isActive ? 'text-white' : 'text-slate-500'}`}>{status.label}</p>
                                {status.key === 'accepted' && driver && (
                                    <>
                                        <p className="text-sm text-slate-400 mt-1">Por: {driver.full_name}</p>
                                        {trip.driver_arrival_time_min && trip.status === 'accepted' && (
                                             <div className="mt-2 text-sm text-amber-300 bg-amber-500/10 p-3 rounded-lg border border-amber-500/20 inline-block animate-fadeSlideIn">
                                                <div className="flex items-center gap-2">
                                                    <Icon type="time" className="w-5 h-5 text-amber-400 flex-shrink-0" />
                                                    <div>
                                                        <span className="font-semibold">El fletero llegará en aprox.</span>
                                                        <strong className="block text-base text-white">{trip.driver_arrival_time_min} minutos</strong>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )
                    })}
                </div>
                <div className="mt-2 space-y-4">
                    {trip.status === 'in_transit' && trip.start_time && <Stopwatch start_time={trip.start_time} />}
                    {user?.role === 'driver' && trip.status === 'accepted' && (
                        <Button onClick={handleStartTrip} className="w-full text-base animate-fadeSlideIn">Iniciar Viaje</Button>
                    )}
                    {user?.role === 'driver' && trip.status === 'in_transit' && (
                        <Button onClick={handleCompleteTrip} className="w-full text-base animate-fadeSlideIn">Marcar como Entregado</Button>
                    )}
                    {user?.role === 'customer' && trip.status === 'completed' && (
                        <>
                            <Card className="bg-slate-800/60 border-slate-700 animate-fadeSlideIn">
                                <h4 className="text-lg font-bold text-slate-100 mb-2">Información de Pago</h4>
                                <p className="text-slate-400 mb-2">Para completar el servicio, por favor transfiere el monto final a la siguiente cuenta de Fletapp:</p>
                                <div className="bg-slate-950/70 p-3 rounded-lg mt-2 text-center">
                                    <p className="text-lg font-mono font-semibold text-amber-300">{ADMIN_PAYMENT_INFO}</p>
                                </div>
                                <p className="text-xs text-slate-500 mt-3">Una vez realizado el pago, presiona el botón de abajo para marcar el viaje como finalizado y notificar al sistema.</p>
                            </Card>
                            <Button onClick={() => setIsPaymentModalOpen(true)} className="w-full text-base animate-fadeSlideIn">He Realizado el Pago</Button>
                        </>
                    )}
                    {user?.role === 'driver' && trip.status === 'completed' && (
                         <div className="text-center p-4 bg-amber-500/10 rounded-lg border border-amber-500/20 animate-fadeSlideIn">
                            <p className="font-bold text-amber-300">Esperando el pago del cliente.</p>
                        </div>
                    )}
                    {trip.status === 'paid' && !showReviewForm && (
                        <div className="text-center p-4 bg-green-500/10 rounded-lg border border-green-500/20 animate-fadeSlideIn">
                            <p className="font-bold text-green-300">¡Viaje pagado con éxito!</p>
                        </div>
                    )}
                </div>
            </Card></div>
        </div>
      </div>
    </div>
    </>
  );
};

export default TripStatusView;
