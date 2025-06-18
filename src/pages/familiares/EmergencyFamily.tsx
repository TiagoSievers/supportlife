import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Box, Typography, Paper, CircularProgress, Button, IconButton } from '@mui/material';
import MapPatner from './MapFamily';
import { useNavigate } from 'react-router-dom';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import { calcularDistanciaTotalKm } from './MapFamily';
import { supabase } from '../../Supabase/supabaseRealtimeClient';

interface Chamado {
  id: string;
  cliente_id: string;
  status: string;
  data_abertura: string;
  localizacao: string;
  posicao_inicial_socorrista?: string;
  endereco_textual?: string;
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
  const [currentRouteCoords, setCurrentRouteCoords] = useState<{ lat: number; lng: number }[]>([]);
  const [routeDuration, setRouteDuration] = useState<number | null>(null); // duração em segundos
  const [distanciaRota, setDistanciaRota] = useState<number | null>(null);
  const [tempoEstimado60, setTempoEstimado60] = useState<number | null>(null);
  const [chegou, setChegou] = useState(false);
  const navigate = useNavigate();
  
  // Rate limiting para API OSRM - aumentado para 30 segundos + cache agressivo
  const lastOSRMCall = useRef<number>(0);
  const MIN_OSRM_INTERVAL = 30000; // 30 segundos entre chamadas
  const routeCache = useRef<Map<string, any>>(new Map()); // Cache para rotas
  const isOSRMCallInProgress = useRef<boolean>(false); // Flag para evitar chamadas simultâneas
  const lastRouteRecalculation = useRef<number>(0); // Controle adicional para recálculos
  const MIN_RECALCULATION_INTERVAL = 15000; // 15 segundos mínimo entre recálculos
  const lastSocorristaPos = useRef<{ lat: number; lng: number } | null>(null); // Para evitar loops

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
          const chamadoData = data[0];
          console.log('[EmergencyFamily] Chamado carregado da API:', chamadoData);
          console.log('[EmergencyFamily] Posição do socorrista no banco:', chamadoData.posicao_inicial_socorrista);
          setChamado(chamadoData);
        } else {
          console.log('[EmergencyFamily] Nenhum chamado encontrado na API');
          setChamado(null);
        }
      } catch (error) {
        console.error('[EmergencyFamily] Erro ao buscar chamado da API:', error);
        setChamado(null);
      } finally {
        setLoading(false);
      }
    };
    fetchChamado();
  }, []);

  // Realtime subscription para escutar mudanças no chamado
  useEffect(() => {
    const chamadoId = localStorage.getItem('chamadoId');
    if (!chamadoId) return;

    const channel = supabase
      .channel('public:chamado')
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'chamado',
          filter: `id=eq.${chamadoId}`
        }, 
        (payload) => {
          console.log('[REALTIME] Mudança detectada no chamado:', payload);
          if (payload.new && payload.new.posicao_inicial_socorrista) {
            console.log('[REALTIME] Nova posição do socorrista:', payload.new.posicao_inicial_socorrista);
            
            // Atualiza o estado do chamado
            setChamado(prev => prev ? {
              ...prev,
              posicao_inicial_socorrista: payload.new.posicao_inicial_socorrista,
              status: payload.new.status || prev.status
            } : null);

            // Atualiza a posição do socorrista no mapa
            const [lat, lng] = payload.new.posicao_inicial_socorrista.split(',').map(Number);
            setSocorristaPos({ lat, lng });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Função para buscar rota real via OSRM com rate limiting melhorado e cache
  const getRouteFromOSRM = useCallback(async (start: { lat: number; lng: number }, end: { lat: number; lng: number }) => {
    // Evitar chamadas simultâneas
    if (isOSRMCallInProgress.current) {
      console.log('[OSRM] Chamada já em progresso, ignorando...');
      return { coords: [], duration: null };
    }
    
    // Criar chave de cache com precisão reduzida (3 casas decimais = ~100m precisão)
    const cacheKey = `${start.lat.toFixed(3)},${start.lng.toFixed(3)}-${end.lat.toFixed(3)},${end.lng.toFixed(3)}`;
    
    // Verificar cache primeiro
    if (routeCache.current.has(cacheKey)) {
      console.log('[OSRM] Usando rota do cache');
      return routeCache.current.get(cacheKey);
    }
    
    const now = Date.now();
    const timeSinceLastCall = now - lastOSRMCall.current;
    
    if (timeSinceLastCall < MIN_OSRM_INTERVAL) {
      const waitTime = MIN_OSRM_INTERVAL - timeSinceLastCall;
      console.log(`[OSRM] Rate limiting: aguardando ${Math.round(waitTime/1000)}s`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    isOSRMCallInProgress.current = true;
    lastOSRMCall.current = Date.now();
    
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
      console.log('[OSRM] Fazendo requisição para API...');
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 429) {
          console.warn('[OSRM] Rate limit atingido, aguardando 60 segundos...');
          await new Promise(resolve => setTimeout(resolve, 60000));
          throw new Error('Rate limit - tente novamente mais tarde');
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (!data.routes || !data.routes[0]) {
        console.warn('[OSRM] Nenhuma rota encontrada');
        return { coords: [], duration: null };
      }
      
      // OSRM retorna [lng, lat], convertemos para {lat, lng}
      const result = {
        coords: data.routes[0].geometry.coordinates.map(([lng, lat]: [number, number]) => ({ lat, lng })),
        duration: data.routes[0].duration // em segundos
      };
      
      // Salvar no cache múltiplas variações para melhor hit rate
      const variations = [
        cacheKey,
        `${start.lat.toFixed(2)},${start.lng.toFixed(2)}-${end.lat.toFixed(2)},${end.lng.toFixed(2)}`,
        `${start.lat.toFixed(4)},${start.lng.toFixed(4)}-${end.lat.toFixed(4)},${end.lng.toFixed(4)}`
      ];
      
      variations.forEach(key => {
        routeCache.current.set(key, result);
      });
      
      console.log('[OSRM] Rota salva no cache com múltiplas variações');
      
      return result;
    } catch (error) {
      console.error('[OSRM] Erro ao buscar rota:', error);
      return { coords: [], duration: null };
    } finally {
      isOSRMCallInProgress.current = false;
    }
  }, [MIN_OSRM_INTERVAL]);

  useEffect(() => {
    if (chamado && chamado.localizacao) {
      const [lat, lon] = chamado.localizacao.split(',').map(Number);
      
      // Usar endereço do banco de dados em vez de API externa
      if (chamado.endereco_textual) {
        setEndereco(chamado.endereco_textual);
      } else {
        setEndereco('Endereço não disponível');
      }
      
      // Determinar posição inicial do socorrista
      let socorristaInicial = socorristaCoords;
      if (chamado.posicao_inicial_socorrista) {
        const [socLat, socLng] = chamado.posicao_inicial_socorrista.split(',').map(Number);
        socorristaInicial = { lat: socLat, lng: socLng };
        setSocorristaPos(socorristaInicial); // Atualiza a posição atual
      }
      
      // Buscar rota real
      setLoadingRoute(true);
      getRouteFromOSRM(socorristaInicial, { lat, lng: lon })
        .then((result) => {
          if (result && result.coords && result.duration) {
            setRouteCoords(result.coords);
            setCurrentRouteCoords(result.coords); // Inicializa também a rota dinâmica
            setRouteDuration(result.duration); // duração em segundos
          } else {
            setRouteCoords([]);
            setCurrentRouteCoords([]);
            setRouteDuration(null);
          }
        })
        .catch(() => {
          setRouteCoords([]);
          setCurrentRouteCoords([]);
          setRouteDuration(null);
        })
        .finally(() => setLoadingRoute(false));
    }
  }, [chamado, getRouteFromOSRM]);

  // Recalcula rota sempre que a posição do socorrista muda - com trimming imediato e controle restritivo
  useEffect(() => {
    if (chamado && chamado.localizacao && socorristaPos) {
      const [lat, lon] = chamado.localizacao.split(',').map(Number);
      const destino = { lat, lng: lon };
      
      // Verifica se a posição mudou comparando com a última posição conhecida
      const currentPosition = `${socorristaPos.lat.toFixed(6)},${socorristaPos.lng.toFixed(6)}`;
      const lastPosition = lastSocorristaPos.current 
        ? `${lastSocorristaPos.current.lat.toFixed(6)},${lastSocorristaPos.current.lng.toFixed(6)}`
        : null;
      
      if (currentPosition !== lastPosition) {
        // Atualiza a referência da última posição
        lastSocorristaPos.current = { ...socorristaPos };
        console.log(`[ROUTE] Posição mudou, aplicando trimming imediato...`);
        
        // ATUALIZAÇÃO IMEDIATA: Remove parte da rota já percorrida
        if (currentRouteCoords.length > 1) {
          // Encontra o ponto mais próximo na rota atual
          let closestIndex = 0;
          let minDistance = Infinity;
          
          for (let i = 0; i < currentRouteCoords.length; i++) {
            const distance = Math.hypot(
              currentRouteCoords[i].lat - socorristaPos.lat,
              currentRouteCoords[i].lng - socorristaPos.lng
            );
            if (distance < minDistance) {
              minDistance = distance;
              closestIndex = i;
            }
          }
          
          // Remove a parte da rota já percorrida (do início até o ponto atual)
          const remainingRoute = currentRouteCoords.slice(closestIndex);
          if (remainingRoute.length > 1) {
            setCurrentRouteCoords(remainingRoute);
            console.log(`[ROUTE] Rota trimada imediatamente - removidos ${closestIndex} pontos`);
          }
        }
        
        // Verifica se a posição mudou significativamente para recálculo completo (>= 500m)
        const distanciaChange = lastSocorristaPos.current ? Math.hypot(
          (socorristaPos.lat - lastSocorristaPos.current.lat) * 111000, // ~111km por grau lat
          (socorristaPos.lng - lastSocorristaPos.current.lng) * 111000 * Math.cos(socorristaPos.lat * Math.PI / 180) // ajuste lng por lat
        ) : 1000; // Se não há posição anterior, força recálculo
        
        const now = Date.now();
        const timeSinceLastRecalc = now - lastRouteRecalculation.current;
        
        // Só recalcula completamente se:
        // 1. Posição mudou mais de 500m E
        // 2. Passou pelo menos 15 segundos desde último recálculo E
        // 3. Não há chamada OSRM em progresso
        if (distanciaChange > 500 && timeSinceLastRecalc > MIN_RECALCULATION_INTERVAL && !isOSRMCallInProgress.current) {
          console.log(`[ROUTE] Mudança significativa detectada: ${Math.round(distanciaChange)}m, recalculando rota completa...`);
          lastRouteRecalculation.current = now;
          
          // Debounce ainda maior para garantir que não haverá sobreposição
          const timer = setTimeout(() => {
            // Verificação dupla para evitar race conditions
            if (!isOSRMCallInProgress.current) {
        getRouteFromOSRM(socorristaPos, destino)
          .then((result) => {
            if (result && result.coords && result.coords.length > 1) {
              setCurrentRouteCoords(result.coords);
                    console.log('[ROUTE] Rota atualizada com sucesso');
            } else {
                    console.log('[ROUTE] Nenhuma rota encontrada');
            }
          })
          .catch(() => {
                  console.log('[ROUTE] Erro ao atualizar rota');
                });
            } else {
              console.log('[ROUTE] Chamada OSRM em progresso, cancelando recálculo');
            }
          }, 10000); // Debounce de 10 segundos
          
          return () => clearTimeout(timer);
        } else {
          if (distanciaChange <= 500) {
            console.log(`[ROUTE] Mudança pequena (${Math.round(distanciaChange)}m), apenas trimming aplicado`);
          } else if (timeSinceLastRecalc <= MIN_RECALCULATION_INTERVAL) {
            console.log(`[ROUTE] Muito cedo para recalcular (${Math.round(timeSinceLastRecalc/1000)}s < 15s), apenas trimming aplicado`);
          } else if (isOSRMCallInProgress.current) {
            console.log('[ROUTE] Chamada OSRM em progresso, apenas trimming aplicado');
          }
        }
      }
    }
  }, [socorristaPos, chamado, getRouteFromOSRM]); // Removido currentRouteCoords para evitar loop

  useEffect(() => {
    if (routeCoords.length > 1) {
      const distKm = calcularDistanciaTotalKm(routeCoords);
      setDistanciaRota(distKm);
      // tempo em minutos para 60 km/h
      setTempoEstimado60(distKm > 0 ? Math.ceil((distKm / 60) * 60) : null);
    } else {
      setDistanciaRota(null);
      setTempoEstimado60(null);
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
                    },
                    ...(socorristaLat !== null && socorristaLng !== null ? [{
                      position: {
                        lat: socorristaLat,
                        lng: socorristaLng
                      },
                      title: 'Sua localização'
                    }] : [])
                    ]}
                    routeCoords={currentRouteCoords.length > 1 ? currentRouteCoords : routeCoords}
                    ambulancePosition={socorristaLat !== null && socorristaLng !== null 
                      ? { lat: socorristaLat, lng: socorristaLng }
                      : undefined}
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
                  } else if (tempoEstimado60) {
                    tempoMin = tempoEstimado60;
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
                    : tempoEstimado60 !== null
                      ? `${tempoEstimado60} min`
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
            {/* Botão de ação - visível apenas se não clicou em Cheguei */}
            {!chegou && (
              <Box sx={{ display: 'flex', flexDirection: 'row', gap: 2, mt: 2, width: '100%', justifyContent: 'flex-start', position: 'relative', zIndex: 1 }}>
                <Button
                  variant="contained"
                  color="primary"
                  sx={{ minWidth: 120, fontWeight: 600 }}
                  onClick={() => navigate(-1)}
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
                  onClick={async () => {
                    if (!chamado) return;
                    const url = process.env.REACT_APP_SUPABASE_URL;
                    const serviceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY;
                    const accessToken = localStorage.getItem('accessToken');
                    if (!url || !serviceKey) {
                      alert('Supabase URL ou Service Key não definidos');
                      return;
                    }
                    if (!accessToken) {
                      alert('Token de acesso não encontrado. Faça login novamente.');
                      return;
                    }
                    setLoading(true);
                    try {
                      const response = await fetch(`${url}/rest/v1/chamado?id=eq.${chamado.id}`, {
                        method: 'PATCH',
                        headers: {
                          'apikey': serviceKey,
                          'Authorization': `Bearer ${accessToken}`,
                          'Content-Type': 'application/json',
                          'Prefer': 'return=minimal'
                        },
                        body: JSON.stringify({ status: 'concluído' })
                      });
                      if (!response.ok) {
                        const data = await response.json();
                        throw new Error(data.error_description || data.message || `Erro ${response.status}`);
                      }
                      navigate('/partner-emergencies');
                    } catch (err: any) {
                      alert('Erro ao concluir chamado: ' + (err.message || err));
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  Chamado concluído
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
