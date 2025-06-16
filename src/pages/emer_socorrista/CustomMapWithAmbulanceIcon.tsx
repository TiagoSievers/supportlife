import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import ambulanceIcon from '../../assets/ambulance-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import rescuerIcon from '../../assets/user-3296 (1).png';

const ambulanceLeafletIcon = L.icon({
  iconUrl: ambulanceIcon,
  shadowUrl: markerShadow,
  iconSize:     [38, 38],
  shadowSize:   [41, 41],
  iconAnchor:   [19, 38],
  shadowAnchor: [12, 41],
  popupAnchor:  [0, -38]
});

const rescuerLeafletIcon = L.icon({
  iconUrl: rescuerIcon,
  shadowUrl: markerShadow,
  iconSize:     [38, 38],
  shadowSize:   [41, 41],
  iconAnchor:   [19, 38],
  shadowAnchor: [12, 41],
  popupAnchor:  [0, -38]
});

const center = { lat: -23.55052, lng: -46.633308 };
const rescuerPosition = { lat: -23.552, lng: -46.634 };

const CustomMapWithAmbulanceIcon: React.FC = () => (
  <div style={{ width: '100%', height: '400px' }}>
    <MapContainer center={center} zoom={13} style={{ width: '100%', height: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={center} icon={ambulanceLeafletIcon}>
        <Popup>
          Marcador de ambulância personalizado!
        </Popup>
      </Marker>
      <Marker position={rescuerPosition} icon={rescuerLeafletIcon}>
        <Popup>
          Marcador do socorrista personalizado!
        </Popup>
      </Marker>
    </MapContainer>
  </div>
);

export default CustomMapWithAmbulanceIcon;

// Para testar este mapa, importe e use <CustomMapWithAmbulanceIcon /> em alguma página ou rota do seu projeto.
// Exemplo: adicione <CustomMapWithAmbulanceIcon /> em App.tsx ou crie uma rota para /custom-map-ambulance 
