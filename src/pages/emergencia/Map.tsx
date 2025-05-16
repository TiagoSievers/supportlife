import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import type { MapContainer as MapContainerType } from 'react-leaflet';
import { Box, Typography, Paper, CircularProgress, Alert } from '@mui/material';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import type { Map as LeafletMap, LeafletEvent } from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Corrigindo o ícone do marcador do Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;

// Criando um ícone personalizado para a localização do usuário
const userLocationIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Ícone padrão para outros marcadores
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

interface MapProps {
  center?: {
    lat: number;
    lng: number;
  };
  zoom: number;
  markers?: MapMarker[];
  showUserLocation?: boolean;
}

// Coordenadas de fallback (São Paulo)
const FALLBACK_COORDS = { lat: -23.5505, lng: -46.6333 };

// Função para obter localização via IP (usando GeoJS) - Permanece igual
const getLocationByIP = async () => {
  try {
    // const response = await fetch('https://ipapi.co/json/'); // URL antiga
    const response = await fetch('https://get.geojs.io/v1/ip/geo.json'); // Nova URL: GeoJS
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    // GeoJS retorna latitude/longitude como strings, precisa converter
    if (!data.latitude || !data.longitude) {
      throw new Error('Invalid IP location data received from GeoJS');
    }
    return {
      lat: parseFloat(data.latitude),
      lng: parseFloat(data.longitude),
      accuracy: 5000, // Precisão aproximada em metros para localização por IP
      source: 'IP'
    };
  } catch (error) {
    console.error('Error getting location by IP (GeoJS):', error);
    return null;
  }
};

// Componente para manipular o mapa após montagem - Permanece igual
const MapController: React.FC<{ onMapReady: (map: LeafletMap) => void }> = ({ onMapReady }) => {
  const map = useMap();

  useEffect(() => {
    onMapReady(map);
  }, [map, onMapReady]);

  return null;
};


const Map: React.FC<MapProps> = ({
  center, // Pode ser usado como fallback inicial se nem GPS nem IP funcionarem
  zoom,
  markers: externalMarkers = [],
  showUserLocation = true
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [currentCenter, setCurrentCenter] = useState<{ lat: number; lng: number } | null>(center || null); // Inicia com center se fornecido
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  // Atualiza os tipos de localização para incluir GPS
  const [locationType, setLocationType] = useState<'GPS' | 'IP' | 'FALLBACK' | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef<LeafletMap | null>(null);

  // Função principal para obter localização (GPS com fallback para IP)
  const getUserLocation = () => {
    setLocationError(null);
    setIsLoading(true);

    // 1. Tenta a Geolocalização do Navegador (precisa de permissão)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          console.log('Precise location (GPS/Browser) obtained:', coords);
          setUserLocation(coords);
          setCurrentCenter(coords); // Centraliza na localização precisa
          setAccuracy(position.coords.accuracy);
          setLocationType('GPS');
          setIsLoading(false);
        },
        async (error) => {
          console.warn(`Browser geolocation error (${error.code}): ${error.message}`);
          let errorMsg = 'Não foi possível obter a localização precisa. ';
          if (error.code === error.PERMISSION_DENIED) {
            errorMsg += 'Permissão negada. ';
          }
          errorMsg += 'Tentando localização aproximada por IP...';
          setLocationError(errorMsg); // Mostra erro parcial enquanto tenta IP

          // 2. Se falhar (erro ou permissão negada), tenta por IP
          try {
            const ipLocation = await getLocationByIP();
            if (ipLocation) {
              console.log('IP location obtained as fallback:', ipLocation);
              setUserLocation({ lat: ipLocation.lat, lng: ipLocation.lng });
              setCurrentCenter({ lat: ipLocation.lat, lng: ipLocation.lng }); // Centraliza no IP
              setAccuracy(ipLocation.accuracy);
              setLocationType('IP');
              setLocationError('Não foi possível obter localização precisa. Usando localização aproximada (IP).'); // Atualiza msg de erro final
            } else {
              throw new Error('Failed to get location from IP API as well.');
            }
          } catch (ipError) {
            console.error('IP location fallback failed:', ipError);
            // 3. Se IP também falhar, usa fallback
            const fallbackCenter = center || FALLBACK_COORDS;
            setUserLocation(fallbackCenter);
            setCurrentCenter(fallbackCenter); // Centraliza no fallback
            setAccuracy(null);
            setLocationType('FALLBACK');
            setLocationError('Não foi possível obter sua localização. Usando localização padrão.'); // Erro final
          } finally {
            setIsLoading(false); // Finaliza o loading após todas as tentativas
          }
        },
        { // Opções para getCurrentPosition
          enableHighAccuracy: true, // Tenta obter a localização mais precisa possível
          timeout: 10000, // Tempo máximo de 10 segundos para obter a localização
          maximumAge: 0 // Não usar cache de localização anterior
        }
      );
    } else {
      // Navegador não suporta geolocalização
      console.warn('Browser does not support geolocation. Trying IP location...');
      setLocationError('Seu navegador não suporta geolocalização. Tentando localização aproximada por IP...'); // Mostra erro parcial
      // Tenta por IP diretamente
      (async () => {
        try {
          const ipLocation = await getLocationByIP();
          if (ipLocation) {
             console.log('IP location obtained (no browser support):', ipLocation);
             setUserLocation({ lat: ipLocation.lat, lng: ipLocation.lng });
             setCurrentCenter({ lat: ipLocation.lat, lng: ipLocation.lng });
             setAccuracy(ipLocation.accuracy);
             setLocationType('IP');
             setLocationError('Não foi possível obter localização precisa (navegador sem suporte). Usando localização aproximada (IP).'); // Erro final
          } else {
             throw new Error('Failed to get location from IP API.');
          }
        } catch (ipError) {
           console.error('IP location fallback failed (no browser support):', ipError);
           const fallbackCenter = center || FALLBACK_COORDS;
           setUserLocation(fallbackCenter);
           setCurrentCenter(fallbackCenter);
           setAccuracy(null);
           setLocationType('FALLBACK');
           setLocationError('Não foi possível obter sua localização. Usando localização padrão.'); // Erro final
        } finally {
           setIsLoading(false); // Finaliza loading
        }
      })();
    }
  };

  // Tenta obter a localização (GPS ou IP) ao montar o componente
  useEffect(() => {
    getUserLocation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Executa apenas uma vez ao montar

  // useEffect para chamar flyTo com segurança
  useEffect(() => {
    // Só chama flyTo se tivermos uma localização (GPS ou IP) E o mapa estiver pronto
    if (mapReady && userLocation && mapRef.current && (locationType === 'GPS' || locationType === 'IP')) {
      console.log(`Map is ready and ${locationType} location obtained, flying to location...`);
      // Verifica se o centro atual já é o desejado para evitar flyTo desnecessário
      const currentMapCenter = mapRef.current.getCenter();
      if (currentMapCenter.lat !== userLocation.lat || currentMapCenter.lng !== userLocation.lng) {
           mapRef.current.flyTo([userLocation.lat, userLocation.lng], zoom);
      }
    }
    // Se for fallback, o MapContainer já centraliza corretamente na inicialização/atualização do currentCenter
  }, [mapReady, userLocation, zoom, locationType]);


  // Prepara os marcadores
  const allMarkers = [...externalMarkers];
  if (showUserLocation && userLocation) {
    let markerTitle = 'Sua localização';
    let markerDescription = 'Localização desconhecida';

    if (locationType === 'GPS') {
        markerTitle = 'Sua localização (Precisa)';
        markerDescription = `Precisão: ${accuracy ? accuracy.toFixed(0) + 'm' : 'N/A'}`;
    } else if (locationType === 'IP') {
        markerTitle = 'Sua localização (Aproximada)';
        markerDescription = 'Localização baseada em IP (aproximada)';
    } else if (locationType === 'FALLBACK') {
        markerTitle = 'Localização Padrão';
        markerDescription = 'Não foi possível obter sua localização.';
    }

    allMarkers.push({
      position: userLocation,
      title: markerTitle,
      description: markerDescription
    });
  }

  const handleMapReady = (map: LeafletMap) => {
    mapRef.current = map;
    setMapReady(true);
     // Se a localização já foi definida ANTES do mapa ficar pronto (raro, mas possível), centraliza agora
    if (userLocation && mapRef.current && (locationType === 'GPS' || locationType === 'IP')) {
        console.log('Map became ready after location was set, ensuring flyTo...');
        const currentMapCenter = mapRef.current.getCenter();
        if (currentMapCenter.lat !== userLocation.lat || currentMapCenter.lng !== userLocation.lng) {
           mapRef.current.flyTo([userLocation.lat, userLocation.lng], zoom);
        }
    }
  };

  // Renderização do Loading
  if (isLoading) {
    return (
      <Paper
        elevation={1}
        sx={{
          position: 'relative',
          width: '100%',
          height: '400px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 2,
          gap: 2,
        }}
      >
        <CircularProgress />
        <Typography variant="body2">
          Obtendo sua localização...
        </Typography>
        {/* Mostra a mensagem de erro parcial se já houver (durante a tentativa de fallback) */}
        {locationError && locationError.includes('Tentando localização aproximada por IP...') && (
           <Typography variant="caption" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
             {locationError}
           </Typography>
        )}
      </Paper>
    );
  }

  // Renderização Principal
  return (
    <Box sx={{ width: '100%', position: 'relative' }}>
      {/* Mostra erro final, se houver (após todas as tentativas) */}
      {locationError && !locationError.includes('Tentando localização aproximada por IP...') && (
        <Alert
          severity={locationType === 'FALLBACK' ? 'error' : 'warning'} // Erro se for fallback, aviso se for só IP
          sx={{ mb: 2 }}
        >
          {locationError}
        </Alert>
      )}
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
        {/* Centraliza o mapa baseado no currentCenter. Se for fallback ou nulo, usa FALLBACK_COORDS */}
        <MapContainer
          center={currentCenter ? [currentCenter.lat, currentCenter.lng] : [FALLBACK_COORDS.lat, FALLBACK_COORDS.lng]}
          zoom={zoom}
          style={{ height: '100%', width: '100%' }}
        >
          <MapController onMapReady={handleMapReady} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {allMarkers.map((marker, index) => (
            <Marker
              key={index}
              position={[marker.position.lat, marker.position.lng]}
               // Usa ícone azul se for GPS ou IP, padrão se for fallback ou outros marcadores
              icon={(locationType === 'GPS' || locationType === 'IP') && marker.title.startsWith('Sua localização') ? userLocationIcon : undefined}
            >
              <Popup>
                <Box sx={{ minWidth: '200px', p: 1 }}>
                  <Typography
                    variant="subtitle1"
                    sx={{ fontWeight: 600, mb: 1 }}
                  >
                    {marker.title}
                  </Typography>
                  {marker.description && (
                    <Typography
                      variant="body2"
                      sx={{ color: '#666', fontSize: '0.875rem', lineHeight: 1.4 }}
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
    </Box>
  );
};

export default Map;