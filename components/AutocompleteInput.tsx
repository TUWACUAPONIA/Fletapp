import React, { useState, useRef } from 'react';
import { useLoadScript, Autocomplete } from '@react-google-maps/api';
import { Input } from './ui';

const libraries: ('places')[] = ['places'];

interface AutocompleteInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onPlaceSelected: (place: google.maps.places.PlaceResult) => void;
}

const AutocompleteInput: React.FC<AutocompleteInputProps> = ({ label, value, onChange, onPlaceSelected }) => {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "", // Replace with your key
    libraries,
  });

  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);

  const onLoad = (autocompleteInstance: google.maps.places.Autocomplete) => {
    setAutocomplete(autocompleteInstance);
  };

  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      onPlaceSelected(place);
      onChange(place.formatted_address || '');
    } else {
      console.log('Autocomplete is not loaded yet!');
    }
  };

  if (loadError) {
    return <div>Error loading maps</div>;
  }

  if (!isLoaded) {
    return <Input label={label} value={value} onChange={(e) => onChange(e.target.value)} disabled />;
  }

  return (
    <Autocomplete
      onLoad={onLoad}
      onPlaceChanged={onPlaceChanged}
      options={{
        types: ["address"],
        componentRestrictions: { country: "ar" },
      }}
    >
      <Input
        label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </Autocomplete>
  );
};

export default AutocompleteInput;