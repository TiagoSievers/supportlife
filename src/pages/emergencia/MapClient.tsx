import React from 'react';
import { Box, Paper } from '@mui/material';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import ambulanceIcon from '../../assets/ambulance-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

interface MapMarker {
  position: {
    lat: number;
    lng: number;
  };
  title: string;
  description?: string;
  type?: 'ambulancia' | 'paciente';
}

interface MapPatnerProps {
  center?: {
    lat: number;
    lng: number;
  };
  zoom: number;
  markers?: MapMarker[];
  routeCoords?: { lat: number; lng: number }[];
  showUserLocation?: boolean;
  children?: React.ReactNode;
  ambulancePosition?: { lat: number; lng: number };
  patientPosition?: { lat: number; lng: number };
}

const ambulanceLeafletIcon = L.icon({
  iconUrl: ambulanceIcon,
  shadowUrl: markerShadow,
  iconSize:     [38, 38],
  shadowSize:   [41, 41],
  iconAnchor:   [19, 38],
  shadowAnchor: [12, 41],
  popupAnchor:  [0, -38]
});

// Ícone padrão do Leaflet para garantir que apareça corretamente
const defaultLeafletIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Removido centro padrão - usar apenas dados do banco

const MapPatnerNavigation: React.FC<MapPatnerProps> = (props) => {
  return <MapPatnerMap {...props} />;
};

const MapPatnerMap: React.FC<MapPatnerProps> = ({
  center,
  zoom,
  markers = [],
  routeCoords = [],
  children,
  ambulancePosition,
  patientPosition
}) => {

  if (!center || !center.lat || !center.lng) {
    console.log('[MapClient] Centro inválido:', center);
    return <div>Aguardando localização...</div>;
  }

  const routeToShow = routeCoords;
  const mapCenter = center;
  
  console.log('[MapClient] Renderizando mapa com coordenadas:', {
    center: mapCenter,
    patientPosition,
    ambulancePosition,
    routeLength: routeToShow?.length
  });

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
          center={[mapCenter.lat, mapCenter.lng]}
          zoom={zoom}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* Sempre mostra o componente FitBoundsToPositions se tiver ambas as posições */}
          {ambulancePosition && patientPosition && (
            <FitBoundsToPositions 
              ambulancePosition={ambulancePosition} 
              patientPosition={patientPosition} 
            />
          )}

          {ambulancePosition && patientPosition && routeToShow && routeToShow.length >= 2 && (
            <>
              {/* Linha da rota */}
              <Polyline
                positions={routeToShow.map(coord => [coord.lat, coord.lng])}
                pathOptions={{ color: 'blue', weight: 4, opacity: 0.8 }}
              />
              {/* Linha reta entre cliente e socorrista */}
              <Polyline
                positions={[
                  [ambulancePosition.lat, ambulancePosition.lng],
                  [patientPosition.lat, patientPosition.lng]
                ]}
                pathOptions={{ 
                  color: '#666',
                  weight: 2,
                  opacity: 0.5,
                  dashArray: '5, 10'
                }}
              />
            </>
          )}
          
          {children}
          
          {ambulancePosition && (
            <Marker position={ambulancePosition} icon={ambulanceLeafletIcon}>
              <Popup>
                Ambulância
              </Popup>
            </Marker>
          )}
          {patientPosition && (
            <Marker position={patientPosition} icon={defaultLeafletIcon}>
              <Popup>
                Local do chamado (paciente)
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </Paper>
    </Box>
  );
};

function FitBounds({ markers }: { markers: MapMarker[] }) {
  const map = useMap();
  React.useEffect(() => {
    if (markers.length >= 2) {
      const bounds = new L.LatLngBounds(
        markers.map(m => [m.position.lat, m.position.lng] as [number, number])
      );
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [markers, map]);
  return null;
}

function FitBoundsToPositions({ 
  ambulancePosition, 
  patientPosition 
}: { 
  ambulancePosition: { lat: number; lng: number };
  patientPosition: { lat: number; lng: number };
}) {
  const map = useMap();
  React.useEffect(() => {
    const bounds = new L.LatLngBounds([
      [ambulancePosition.lat, ambulancePosition.lng],
      [patientPosition.lat, patientPosition.lng]
    ]);
    
    // Adiciona padding maior e força o update do mapa
    const padding: [number, number] = [100, 100];
    map.fitBounds(bounds, { 
      padding,
      maxZoom: 15, // Limita o zoom máximo
      animate: true,
      duration: 0.5 // Meio segundo de animação
    });

    // Força uma atualização do mapa após um pequeno delay
    setTimeout(() => {
      map.invalidateSize();
      map.fitBounds(bounds, { 
        padding,
        maxZoom: 15,
        animate: true,
        duration: 0.5
      });
    }, 100);
  }, [ambulancePosition, patientPosition, map]);
  return null;
}

export function calcularDistanciaTotalKm(routeCoords: { lat: number; lng: number }[]): number {
  if (!routeCoords || routeCoords.length < 2) return 0;
  const R = 6371;
  let total = 0;
  for (let i = 1; i < routeCoords.length; i++) {
    const lat1 = routeCoords[i - 1].lat;
    const lon1 = routeCoords[i - 1].lng;
    const lat2 = routeCoords[i].lat;
    const lon2 = routeCoords[i].lng;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    total += R * c;
  }
  return total;
}

export default MapPatnerNavigation; 
