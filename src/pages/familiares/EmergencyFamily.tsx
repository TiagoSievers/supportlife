import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, CircularProgress, Button } from '@mui/material';
import MapFamiliarEme from './MapFamiliarEme';
import { getAddressFromCoords } from '../emer_socorrista/getAddressFromCoordsSocorrista';
import { useNavigate } from 'react-router-dom';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import { calcularDistanciaTotalKm } from './MapFamiliarEme';

interface Chamado {
  id: string;
  cliente_id: string;
  status: string;
  data_abertura: string;
  localizacao: string;
  posicao_inicial_socorrista?: string;
}

const socorristaCoords = { lat: -25.4284, lng: -49.2733 };

const EmergencyFamily: React.FC = () => {
  const [chamado, setChamado] = useState<Chamado | null>(null);
  const [endereco, setEndereco] = useState<string | null>(null);
  const [distancia, setDistancia] = useState<string>('');
  const [estimativaTempo, setEstimativaTempo] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [routeCoords, setRouteCoords] = useState<{ lat: number; lng: number }[]>([]);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [socorristaPos, setSocorristaPos] = useState(socorristaCoords);
  const [routeDuration, setRouteDuration] = useState<number | null>(null); // duração em segundos
  const [distanciaRota, setDistanciaRota] = useState<number | null>(null);
  const [tempoEstimado60, setTempoEstimado60] = useState<number | null>(null);
  const [tempoEstimadoSimulacao, setTempoEstimadoSimulacao] = useState<number | null>(null);
  const [chegou, setChegou] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Buscar chamado real pelo id salvo no localStorage
    const fetchChamado = async () => {
      const chamadoId = localStorage.getItem('chamadoId');
      if (!chamadoId) {
        setChamado(null);
        setLoading(false);
        return;
      }
      const url = process.env.REACT_APP_SUPABASE_URL;
      const serviceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY;
      const accessToken = localStorage.getItem('accessToken');
      if (!url || !serviceKey) {
        setChamado(null);
        setLoading(false);
        return;
      }
      if (!accessToken) {
        setChamado(null);
        setLoading(false);
        return;
      }
      try {
        const response = await fetch(`${url}/rest/v1/chamado?id=eq.${chamadoId}`, {
          method: 'GET',
          headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          setChamado(data[0]);
        } else {
          setChamado(null);
        }
      } catch {
        setChamado(null);
      } finally {
        setLoading(false);
      }
    };
    fetchChamado();
  }, []);

  useEffect(() => {
    if (chamado && chamado.localizacao) {
      const [lat, lon] = chamado.localizacao.split(',').map(Number);
      getAddressFromCoords(lat, lon).then(setEndereco);
      // Buscar rota real
      setLoadingRoute(true);
      getRouteFromOSRM(socorristaCoords, { lat, lng: lon })
        .then((result) => {
          if (result && result.coords && result.duration) {
            setRouteCoords(result.coords);
            setRouteDuration(result.duration); // duração em segundos
          } else {
            setRouteCoords([]);
            setRouteDuration(null);
          }
        })
        .catch(() => {
          setRouteCoords([]);
          setRouteDuration(null);
        })
        .finally(() => setLoadingRoute(false));
      // Atualizar posição do socorrista a partir do chamado
      if (chamado.posicao_inicial_socorrista) {
        const [socLat, socLng] = chamado.posicao_inicial_socorrista.split(',').map(Number);
        setSocorristaPos({ lat: socLat, lng: socLng });
      }
    }
  }, [chamado]);

  useEffect(() => {
    if (routeCoords.length > 1) {
      const distKm = calcularDistanciaTotalKm(routeCoords);
      setDistanciaRota(distKm);
      // tempo em minutos para 60 km/h
      setTempoEstimado60(distKm > 0 ? Math.ceil((distKm / 60) * 60) : null);
      // tempo em minutos para simulação mais rápida (90 km/h)
      setTempoEstimadoSimulacao(distKm > 0 ? Math.ceil((distKm / 90) * 60) : null);
    } else {
      setDistanciaRota(null);
      setTempoEstimado60(null);
      setTempoEstimadoSimulacao(null);
    }
  }, [routeCoords]);

  function calcularDistancia(lat1: number, lon1: number, lat2: number, lon2: number) {
    // Fórmula de Haversine
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  function formatarDataHora(data: string) {
    if (!data) return '';
    const d = new Date(data);
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const ano = d.getFullYear();
    const hora = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dia}/${mes}/${ano} ${hora}:${min}`;
  }

  // Função para finalizar atendimento
  const finalizarAtendimento = async () => {
    // Aqui você pode fazer o PATCH real se quiser
    // Exemplo de mock:
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigate('/partner-emergencies');
    }, 1000);
  };

  // Função para buscar rota real via OSRM
  async function getRouteFromOSRM(start: { lat: number; lng: number }, end: { lat: number; lng: number }) {
    const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
    const response = await fetch(url);
    const data = await response.json();
    if (!data.routes || !data.routes[0]) return { coords: [], duration: null };
    // OSRM retorna [lng, lat], convertemos para {lat, lng}
    return {
      coords: data.routes[0].geometry.coordinates.map(([lng, lat]: [number, number]) => ({ lat, lng })),
      duration: data.routes[0].duration // em segundos
    };
  }

  // Função utilitária para encontrar o ponto mais próximo da rota
  function getClosestRoutePoint(
    current: { lat: number; lng: number },
    routeCoords: { lat: number; lng: number }[]
  ) {
    let minDist = Infinity;
    let closest = routeCoords[0];
    for (const p of routeCoords) {
      const dist = Math.hypot(current.lat - p.lat, current.lng - p.lng);
      if (dist < minDist) {
        minDist = dist;
        closest = p;
      }
    }
    return closest;
  }

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      gap: 3,
      maxWidth: 800,
      mx: 'auto',
      minHeight: 'calc(100vh - 64px)',
      position: 'relative',
      overflow: 'hidden',
      pb: 2,
      mt: 3
    }}>
      {/* Mapa ocupa todo o espaço até o Paper */}
      {/* chamado ? (
        <Box sx={{ mb: 3, minHeight: 250 }}>
          <MapPatner
            center={{
              lat: Number(chamado.localizacao.split(',')[0]),
              lng: Number(chamado.localizacao.split(',')[1])
            }}
            zoom={15}
            markers={[{
              position: {
                lat: Number(chamado.localizacao.split(',')[0]),
                lng: Number(chamado.localizacao.split(',')[1])
              },
              title: 'Local do chamado'
            }, {
              position: socorristaCoords,
              title: 'Sua localização'
            }]}
          />
        </Box>
      ) : (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3, mb: 3, minHeight: 250 }}>
          <CircularProgress />
        </Box>
      ) */}
      {/* Paper de Informações do Chamado */}
      <Paper elevation={0} sx={{
        borderRadius: 2,
        backgroundColor: 'transparent',
        boxShadow: 'none',
        border: 'none',
        maxWidth: 800,
        mx: 'auto',
        mb: 2,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        p: { xs: 2, sm: 3 },
        position: 'relative',
      }}>
        {/* Marca d'água */}
        <Box
          component="img"
          src={require('../../assets/Design sem nome (7).png')}
          alt="Marca d'água Support Life"
          sx={{
            position: 'absolute',
            top: '55%',
            left: 0,
            width: '100%',
            height: '60%',
            objectFit: 'contain',
            opacity: 0.07,
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
        <Typography variant="h6" sx={{ mb: 1, position: 'relative', zIndex: 1 }}>
          Informações do Chamado{chamado ? ` (ID: ${chamado.id})` : ''}
        </Typography>
        {chamado ? (
          <>
            {(() => {
              // Extrai a posição inicial do socorrista se existir
              let socorristaLat: number | null = null;
              let socorristaLng: number | null = null;
              if (chamado.posicao_inicial_socorrista) {
                const parts = chamado.posicao_inicial_socorrista.split(',');
                if (parts.length === 2) {
                  socorristaLat = Number(parts[0]);
                  socorristaLng = Number(parts[1]);
                }
              }
              // Calcula o índice da posição do socorrista na rota
              let socorristaIdx = -1;
              if (socorristaLat !== null && socorristaLng !== null && routeCoords.length > 1) {
                socorristaIdx = routeCoords.findIndex(p => p.lat === socorristaLat && p.lng === socorristaLng);
              }
              return (
                <Box sx={{ width: '100%', minHeight: 350, maxHeight: 500, position: 'relative', zIndex: 1 }}>
                  <MapFamiliarEme
                    center={{
                      lat: Number(chamado.localizacao.split(',')[0]),
                      lng: Number(chamado.localizacao.split(',')[1])
                    }}
                    zoom={15}
                    markers={[{
                      position: {
                        lat: Number(chamado.localizacao.split(',')[0]),
                        lng: Number(chamado.localizacao.split(',')[1])
                      },
                      title: 'Local do chamado'
                    },
                    ...(socorristaLat !== null && socorristaLng !== null ? [{
                      position: {
                        lat: socorristaLat,
                        lng: socorristaLng
                      },
                      title: 'Sua localização'
                    }] : [])
                    ]}
                    routeCoords={routeCoords.length > 1 && socorristaIdx >= 0
                      ? routeCoords.slice(socorristaIdx)
                      : routeCoords}
                    ambulancePosition={socorristaPos}
                  />
                  {loadingRoute && (
                    <Box sx={{ position: 'absolute', top: 10, right: 10, zIndex: 10 }}>
                      <CircularProgress size={24} />
                    </Box>
                  )}
                </Box>
              );
            })()}
            {/* Exibir informações abaixo do mapa */}
            <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4, mt: 2, position: 'relative', zIndex: 1 }}>
              {/* Horário de chegada previsto - esquerda */}
              <Typography variant="h5" sx={{ fontWeight: 700, textAlign: 'left', minWidth: 90 }}>
                {(() => {
                  let tempoMin = 0;
                  if (routeDuration) {
                    tempoMin = Math.ceil(routeDuration / 60);
                  } else if (tempoEstimadoSimulacao) {
                    tempoMin = tempoEstimadoSimulacao;
                  }
                  if (!tempoMin) return '--:--';
                  const chegada = new Date();
                  chegada.setMinutes(chegada.getMinutes() + tempoMin);
                  return chegada.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                })()}
              </Typography>
              {/* Tempo restante de viagem - centro */}
              <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                <Typography variant="body1" sx={{ textAlign: 'center', minWidth: 90 }}>
                  {routeDuration
                    ? `${Math.ceil(routeDuration / 60)} min`
                    : tempoEstimadoSimulacao !== null
                      ? `${tempoEstimadoSimulacao} min`
                      : '--'}
                </Typography>
              </Box>
              {/* Distância restante - direita */}
              <Typography variant="body1" sx={{ textAlign: 'right', minWidth: 90 }}>
                {distanciaRota !== null ? `${distanciaRota.toFixed(2)} km` : '--'}
              </Typography>
            </Box>
            {/* Endereço completo abaixo da linha principal */}
            <Typography variant="body2" sx={{ textAlign: 'left', color: 'text.secondary', mt: 1, position: 'relative', zIndex: 1 }}>
              {endereco || 'Endereço não disponível'}
            </Typography>
            {/* Botões de ação - visível apenas se não clicou em Cheguei */}
            {!chegou && (
              <Box sx={{ display: 'flex', flexDirection: 'row', gap: 2, mt: 2, width: '100%', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
                <Button
                  variant="contained"
                  color="primary"
                  sx={{ minWidth: 120, fontWeight: 600 }}
                  onClick={() => {
                    navigate('/family-emergencies');
                  }}
                  disabled={loading}
                >
                  Voltar
                </Button>
              </Box>
            )}
            {/* Botão verde fixo no footer para concluir chamado, aparece só após Cheguei */}
            {chegou && (
              <Box sx={{ position: 'fixed', left: 0, bottom: 0, width: '100%', zIndex: 2000, display: 'flex', justifyContent: 'center', pb: 2 }}>
                <Button
                  variant="contained"
                  color="success"
                  sx={{ minWidth: 220, fontWeight: 700, fontSize: 18, py: 1.5, borderRadius: 3, boxShadow: 3 }}
                  onClick={() => {
                    navigate('/family-emergencies');
                  }}
                >
                  Voltar para lista
                </Button>
              </Box>
            )}
          </>
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default EmergencyFamily; 