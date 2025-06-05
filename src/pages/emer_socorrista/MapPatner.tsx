import React, { useEffect, useState } from 'react';
import { Box, Paper } from '@mui/material';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
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
  routeCoords?: { lat: number; lng: number }[];
  showUserLocation?: boolean;
  chamadoId?: number;
  children?: React.ReactNode;
}

const FALLBACK_COORDS = { lat: -23.5505, lng: -46.6333 };

const MapPatner: React.FC<MapPatnerProps> = ({
  center,
  zoom,
  markers = [],
  routeCoords = [],
  chamadoId,
  children
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chamadoData, setChamadoData] = useState<any>(null);

  useEffect(() => {
    if (chamadoId) {
      console.log('[MapPatner] useEffect disparado para chamadoId:', chamadoId);
    } else {
      console.log('[MapPatner] useEffect disparado sem chamadoId, chamada API não será feita.');
    }
    const fetchChamado = async () => {
      if (!chamadoId) return;
      setLoading(true);
      setError(null);
      try {
        const url = process.env.REACT_APP_SUPABASE_URL;
        const serviceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY;
        console.log('[MapPatner] Variáveis de ambiente:', { url, serviceKey });
        if (!url || !serviceKey) {
          console.error('[MapPatner] Supabase URL ou Service Key não definidos');
          throw new Error('Supabase URL ou Service Key não definidos');
        }
        const endpoint = `${url}/rest/v1/chamado?select=*&id=eq.${chamadoId}`;
        const headers = {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json'
        };
        console.log('[MapPatner] Fazendo GET:', endpoint);
        console.log('[MapPatner] Headers:', headers);
        const response = await fetch(endpoint, {
          method: 'GET',
          headers
        });
        // Log detalhado da resposta da API
        const responseClone = response.clone();
        let responseData;
        try {
          responseData = await responseClone.json();
        } catch (e) {
          responseData = '[Resposta não é JSON ou erro ao parsear]';
        }
        console.log('[MapPatner] Resposta bruta da API:', responseData);
        if (!response.ok) {
          console.error('[MapPatner] Erro na resposta:', responseData);
          throw new Error(responseData.error_description || responseData.message || `Erro ${response.status}`);
        }
        if (responseData && responseData[0]) {
          setChamadoData(responseData[0]);
          console.log('[MapPatner] Dados do chamado salvos no estado:', responseData[0]);
        } else {
          setError('Chamado não encontrado');
          console.warn('[MapPatner] Chamado não encontrado para chamadoId:', chamadoId);
        }
      } catch (err: any) {
        setError(err.message || 'Erro ao buscar dados do chamado');
        console.error('[MapPatner] Erro no fetchChamado:', err);
      } finally {
        setLoading(false);
        console.log('[MapPatner] Finalizou fetchChamado para chamadoId:', chamadoId);
      }
    };
    fetchChamado();
  }, [chamadoId]);

  // Montar markers dinâmicos incluindo o chamado
  const dynamicMarkers = [
    ...markers,
    chamadoData?.localizacao && {
      position: {
        lat: Number(chamadoData.localizacao.split(',')[0]),
        lng: Number(chamadoData.localizacao.split(',')[1])
      },
      title: `Chamado #${chamadoData.id}`,
      description: `Status: ${chamadoData.status}`
    }
  ].filter((m): m is MapMarker => Boolean(m));

  return (
    <Box sx={{ width: '100%', position: 'relative' }}>
      <Paper
        elevation={3}
        sx={{
          borderRadius: 2,
          overflow: 'hidden',
          width: '100%',
          height: '250px',
          minHeight: '250px',
          maxHeight: '500px',
          position: 'relative',
          '& .leaflet-container': {
            width: '100%',
            height: '100%',
          },
        }}
      >
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            Carregando dados do chamado...
          </Box>
        ) : error ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'error.main' }}>
            {error}
          </Box>
        ) : (
          <MapContainer
            center={
              chamadoData?.localizacao
                ? [
                    Number(chamadoData.localizacao.split(',')[0]),
                    Number(chamadoData.localizacao.split(',')[1])
                  ]
                : center
                ? [center.lat, center.lng]
                : [FALLBACK_COORDS.lat, FALLBACK_COORDS.lng]
            }
            zoom={zoom}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {routeCoords && routeCoords.length > 1 && (
              <Polyline
                positions={routeCoords.map(coord => [coord.lat, coord.lng])}
                pathOptions={{ color: 'blue', weight: 4 }}
              />
            )}
            {dynamicMarkers.map((marker, index) => (
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
        )}
      </Paper>
    </Box>
  );
};

export default MapPatner; 