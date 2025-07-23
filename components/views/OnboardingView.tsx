



import React, { useState, useContext, useRef, useEffect } from 'react';
import { AppContext } from '../../AppContext';
import { UserRole, Driver, Customer, Profile, VehicleType } from '../../types';
import { Button, Input, Card, Icon, Select } from '../ui';

const OnboardingView: React.FC = () => {
  const context = useContext(AppContext);
  const [role, setRole] = useState<'selection' | 'driver' | 'customer'>('selection');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  useEffect(() => {
    // If the user is logged in when this view is rendered (i.e., after a successful registration), redirect to dashboard.
    if (context?.user) {
        context.setView('dashboard');
    }
  }, [context?.user, context?.setView]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("handleSubmit triggered"); // Debugging message
    setError('');
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    if (!context?.registerUser) {
        setError("Error de la aplicación. Intente de nuevo.");
        setIsLoading(false);
        return;
    }
    
    if (data.password !== data.confirmPassword) {
        setError("Las contraseñas no coinciden.");
        setIsLoading(false);
        return;
    }

    const baseUser = {
      full_name: data.full_name as string,
      dni: data.dni as string,
      email: data.email as string,
      phone: data.phone as string,
      address: data.address as string,
    };

    const userToRegister = role === 'driver'
      ? {
          ...baseUser,
          role: 'driver' as UserRole,
          vehicle: data.vehicle as string,
          vehicle_type: data.vehicle_type as VehicleType,
          capacity_kg: Number(data.capacity_kg),
          capacity_m3: Number(data.capacity_m3),
          service_radius_km: Number(data.service_radius_km),
          photo_url: photoPreview || `https://ui-avatars.com/api/?name=${encodeURIComponent(baseUser.full_name)}&background=0f172a&color=fff&size=200`,
          payment_info: data.payment_info as string,
        }
      : {
          ...baseUser,
          role: 'customer' as UserRole,
          vehicle: null,
          vehicle_type: null,
          capacity_kg: null,
          capacity_m3: null,
          service_radius_km: null,
          photo_url: null,
          payment_info: null,
        };

    console.log("Calling registerUser context function with data:", userToRegister);
    const authError = await context.registerUser(userToRegister as Omit<Profile, 'id'>, data.password as string);
    console.log("registerUser context function returned:", authError);

    if (authError) {
        console.error("Registration failed with error:", authError);
        setError(authError.message || "Ocurrió un error durante el registro.");
    } else {
        console.log("Registration call successful, showing confirmation message.");
        setRegistrationSuccess(true);
    }
    setIsLoading(false);
  };

  const RoleSelectionCard: React.FC<{onClick: () => void, iconType: string, title: string, description: string, animationDelay: string}> = ({ onClick, iconType, title, description, animationDelay }) => (
      <Card
          onClick={onClick}
          className="flex-1 max-w-md w-full cursor-pointer transition-all duration-300 text-center staggered-child"
          style={{animationDelay}}
      >
          <Icon type={iconType} className="w-16 h-16 mx-auto text-amber-400 mb-6 transition-transform duration-300 group-hover:scale-110" />
          <h3 className="text-2xl font-bold mb-2 text-slate-100">{title}</h3>
          <p className="text-slate-400">{description}</p>
      </Card>
  );

  if (role === 'selection') {
    return (
      <div className="container mx-auto p-4 pt-16 text-center">
        <h2 className="text-4xl font-bold mb-4 text-slate-100 staggered-child" style={{animationDelay: '0.1s'}}>Crear una Cuenta</h2>
        <p className="text-slate-300 mb-12 text-lg staggered-child" style={{animationDelay: '0.2s'}}>Para continuar, por favor elige tu rol.</p>
        <div className="flex flex-col md:flex-row gap-8 justify-center items-center">
            <RoleSelectionCard 
                onClick={() => setRole('driver')}
                iconType="fleteroPro"
                title="Soy Fletero"
                description="Ofrece tus servicios de flete, encuentra nuevos clientes y gestiona tus viajes."
                animationDelay="0.4s"
            />
            <RoleSelectionCard 
                onClick={() => setRole('customer')}
                iconType="clientePro"
                title="Soy Cliente"
                description="Encuentra fleteros disponibles y confiables para tu carga de forma rápida y segura."
                animationDelay="0.5s"
            />
        </div>
      </div>
    );
  }

  const vehicleTypeOptions = [
    { value: 'Furgoneta', label: 'Furgoneta' },
    { value: 'Furgón', label: 'Furgón' },
    { value: 'Pick UP', label: 'Pick UP' },
    { value: 'Camión ligero', label: 'Camión ligero' },
    { value: 'Camión pesado', label: 'Camión pesado' },
  ];

  if (registrationSuccess) {
    return (
      <div className="container mx-auto p-4 pt-16 text-center">
        <div className="max-w-md mx-auto animate-fadeSlideIn">
          <Card>
            <Icon type="checkCircle" className="w-20 h-20 mx-auto text-green-400 mb-6" />
            <h2 className="text-3xl font-bold mb-4 text-slate-100">¡Registro Exitoso!</h2>
            <p className="text-slate-300 mb-8">
              Hemos enviado un correo de confirmación a tu dirección de email. Por favor, haz clic en el enlace del correo para activar tu cuenta y poder iniciar sesión.
            </p>
            <Button onClick={() => context?.setView('login')}>Ir a Iniciar Sesión</Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 pt-8">
      <div className="max-w-2xl mx-auto animate-fadeSlideIn">
        <Card>
          {!registrationSuccess && (
            <>
              <button onClick={() => setRole('selection')} className="text-slate-400 hover:text-white mb-8 transition-colors">&larr; Volver a seleccionar rol</button>
              <h2 className="text-3xl font-bold mb-8 text-slate-100">Configurar perfil de <span className="fletapp-text-gradient bg-clip-text text-transparent bg-gradient-to-r from-amber-300 to-orange-500">{role === 'driver' ? 'Fletero' : 'Cliente'}</span></h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <Input name="full_name" label="Nombre Completo" required />
                <Input name="dni" label="DNI" required />
                <Input name="email" label="Correo Electrónico" type="email" required />
                <Input name="password" label="Contraseña" type="password" required minLength={6} />
                <Input name="confirmPassword" label="Confirmar Contraseña" type="password" required />
                <Input name="phone" label="Teléfono" type="tel" required />
                <Input name="address" label={role === 'driver' ? 'Dirección Laboral' : 'Dirección Registrada'} required />
                
                {role === 'driver' && (
                  <>
                    <div className="flex items-center gap-6 pt-2">
                      <img src={photoPreview || 'https://ui-avatars.com/api/?name=?&background=0f172a&color=fff&size=96'} alt="Profile preview" className="w-24 h-24 rounded-full object-cover bg-slate-800 border-2 border-slate-700"/>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Foto de perfil</label>
                        <input type="file" accept="image/*" ref={fileInputRef} onChange={handlePhotoChange} className="hidden" />
                        <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>Subir Foto</Button>
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                      <Input name="vehicle" label="Vehículo (ej. Ford F-100)" required />
                      <Select name="vehicle_type" label="Tipo de Vehículo" options={vehicleTypeOptions} required />
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                      <Input name="capacity_kg" label="Capacidad de Carga (kg)" type="number" required />
                      <Input name="capacity_m3" label="Capacidad de Carga (m³)" type="number" step="0.1" required />
                    </div>
                    <Input name="service_radius_km" label="Área de Fleteo (km desde tu domicilio)" type="number" required />
                    <Input name="payment_info" label="Ingresa el Alias o CBU donde recibirás tus pagos" required />
                  </>
                )}
                {error && <p className="text-sm text-red-400 text-center animate-shake">{error}</p>}
                <Button type="submit" isLoading={isLoading} className="w-full !mt-8 !py-4 text-lg">Completar Registro</Button>
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default OnboardingView;
