import React from 'react';
import { Box, Paper } from '@mui/material';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

interface MapMarker {
  position: {
    lat: number;
    lng: number;
  };
  title: string;
}

interface MapPatnerProps {
  center: {
    lat: number;
    lng: number;
  };
  zoom: number;
  markers?: MapMarker[];
}

// Ícone padrão do Leaflet para garantir que apareça corretamente
const defaultLeafletIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const MapPatnerNavigation: React.FC<MapPatnerProps> = (props) => {
  return <MapPatnerMap {...props} />;
};

const MapPatnerMap: React.FC<MapPatnerProps> = ({
  center,
  zoom,
  markers = []
}) => {
  if (!center) return null;

  return (
    <Box sx={{ width: '100%', position: 'relative', pb: 3 }}>
      <Paper
        elevation={3}
        sx={{
          borderRadius: 2,
          overflow: 'hidden',
          width: '100%',
          height: '360px',
          position: 'relative',
          '& .leaflet-container': {
            width: '100%',
            height: '100%',
          },
        }}
      >
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={zoom}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={center} icon={defaultLeafletIcon}>
            <Popup>
              Local do chamado
            </Popup>
          </Marker>
        </MapContainer>
      </Paper>
    </Box>
  );
};

export default MapPatnerNavigation; 