import React from 'react';
import { Box, Paper } from '@mui/material';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Importação dos ícones do Leaflet
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface MapMarker {
  position: {
    lat: number;
    lng: number;
  };
  title: string;
  description?: string;
}

interface MapPatnerProps {
  center?: {
    lat: number;
    lng: number;
  };
  zoom: number;
  markers?: MapMarker[];
  showUserLocation?: boolean;
  children?: React.ReactNode;
}

const FALLBACK_COORDS = { lat: -23.5505, lng: -46.6333 };

const MapPatner: React.FC<MapPatnerProps> = ({
  center,
  zoom,
  markers = [],
  children
}) => {
  return (
    <Box sx={{ width: '100%', position: 'relative' }}>
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
          center={center ? [center.lat, center.lng] : [FALLBACK_COORDS.lat, FALLBACK_COORDS.lng]}
          zoom={zoom}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {markers.map((marker, index) => (
            <Marker
              key={index}
              position={[marker.position.lat, marker.position.lng]}
            >
              <Popup>
                <strong>{marker.title}</strong>
                {marker.description && <div>{marker.description}</div>}
              </Popup>
            </Marker>
          ))}
          {children}
        </MapContainer>
      </Paper>
    </Box>
  );
};

export default MapPatner; 