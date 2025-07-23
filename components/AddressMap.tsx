import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Button, Card } from './ui';

// Fix for default icon issue with webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

interface AddressMapProps {
  onLocationSelect: (lat: number, lng: number) => void;
  onClose: () => void;
}

const LocationPicker: React.FC<{ setPosition: (position: L.LatLng) => void }> = ({ setPosition }) => {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });
  return null;
};

const AddressMap: React.FC<AddressMapProps> = ({ onLocationSelect, onClose }) => {
  const [position, setPosition] = useState<L.LatLng | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([-34.6037, -58.3816]); // Default to Buenos Aires

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMapCenter([pos.coords.latitude, pos.coords.longitude]);
        setPosition(new L.LatLng(pos.coords.latitude, pos.coords.longitude));
      },
      () => {
        console.warn("Could not get user location, defaulting to Buenos Aires.");
      }
    );
  }, []);

  const handleConfirm = () => {
    if (position) {
      onLocationSelect(position.lat, position.lng);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 animate-fadeSlideIn">
      <Card className="w-full max-w-3xl h-[80vh] flex flex-col">
        <h3 className="text-xl font-bold mb-4 text-slate-100">Selecciona la dirección en el mapa</h3>
        <div className="flex-grow rounded-md overflow-hidden">
            <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <LocationPicker setPosition={setPosition} />
                {position && <Marker position={position}></Marker>}
            </MapContainer>
        </div>
        <div className="flex justify-end gap-4 mt-4">
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleConfirm} disabled={!position}>Confirmar Ubicación</Button>
        </div>
      </Card>
    </div>
  );
};

export default AddressMap;