import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Box, Typography, Paper } from '@mui/material';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Corrigindo o ícone do marcador do Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

interface MapMarker {
  position: {
    lat: number;
    lng: number;
  };
  title: string;
  description?: string;
}

interface MapProps {
  center: {
    lat: number;
    lng: number;
  };
  zoom: number;
  markers?: MapMarker[];
}

const Map: React.FC<MapProps> = ({ center, zoom, markers = [] }) => {
  return (
    <Paper
      elevation={1}
      sx={{
        position: 'relative',
        width: '100%',
        height: '400px',
        borderRadius: 2,
        overflow: 'hidden',
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
        {markers.map((marker, index) => (
          <Marker key={index} position={[marker.position.lat, marker.position.lng]}>
            <Popup>
              <Box sx={{ minWidth: '200px', p: 1 }}>
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: 600,
                    mb: 1,
                  }}
                >
                  {marker.title}
                </Typography>
                {marker.description && (
                  <Typography
                    variant="body2"
                    sx={{
                      color: '#666',
                      fontSize: '0.875rem',
                      lineHeight: 1.4,
                    }}
                  >
                    {marker.description}
                  </Typography>
                )}
              </Box>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </Paper>
  );
};

export default Map; 