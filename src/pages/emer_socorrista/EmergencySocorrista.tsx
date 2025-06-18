import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Box, Typography, Paper, CircularProgress, Button, IconButton } from '@mui/material';
import MapPatner from './MapPatner';
import Cronometro from './CronometroSocorrista';

import { useNavigate } from 'react-router-dom';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import { calcularDistanciaTotalKm } from './MapPatner';
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

const EmergencySocorrista: React.FC = () => {
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
  const [tempoEstimadoSimulacao, setTempoEstimadoSimulacao] = useState<number | null>(null);
  const [chegou, setChegou] = useState(false);
  const [simulacaoAtiva, setSimulacaoAtiva] = useState(false);
  const [intervalSimulacao, setIntervalSimulacao] = useState<NodeJS.Timeout | null>(null);
  const [trackingAtivo, setTrackingAtivo] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const lastSoundPlay = useRef<number>(0);
  const MIN_SOUND_INTERVAL = 5000; // 5 segundos entre sons
  const navigate = useNavigate();

  // Rate limiting para API OSRM - mesmo sistema do EmergencyFamily
  const lastOSRMCall = useRef<number>(0);
  const MIN_OSRM_INTERVAL = 30000; // 30 segundos entre chamadas
  const isOSRMCallInProgress = useRef<boolean>(false); // Flag para evitar chamadas simultâneas
  const lastSocorristaPos = useRef<{ lat: number; lng: number } | null>(null); // Para evitar loops
  const lastDBUpdate = useRef<number>(0); // Controle de atualizações do banco
  const MIN_DB_UPDATE_INTERVAL = 8000; // 8 segundos entre atualizações do banco

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
          console.log('[EmergencySocorrista] Chamado carregado da API:', chamadoData);
          console.log('[EmergencySocorrista] Posição do socorrista no banco:', chamadoData.posicao_inicial_socorrista);
          // Ordenar por data de criação (data_abertura) - mais recente primeiro
          const chamadosOrdenados = data.sort((a: any, b: any) => {
            if (a.data_abertura && b.data_abertura) {
              return new Date(b.data_abertura).getTime() - new Date(a.data_abertura).getTime();
            }
            // Se não há data, usar ID como fallback (assumindo IDs sequenciais)
            return (b.id || 0) - (a.id || 0);
          });
          setChamado(chamadosOrdenados[0]);
        } else {
          console.log('[EmergencySocorrista] Nenhum chamado encontrado na API');
          setChamado(null);
        }
      } catch (error) {
        console.error('[EmergencySocorrista] Erro ao buscar chamado da API:', error);
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
          filter: `id=eq.${chamadoId}` // Removendo o filtro de status aqui para debugar
        }, 
        (payload) => {
          console.log('[REALTIME] Mudança detectada no chamado:', payload);
          console.log('[REALTIME] Status do chamado:', payload.new?.status); // Log adicional para debug
          
          // Tocar o som para qualquer atualização do chamado por enquanto
          const now = Date.now();
          if (now - lastSoundPlay.current >= MIN_SOUND_INTERVAL) {
            console.log('[REALTIME] Tentando tocar som de notificação'); // Log adicional para debug
            const audio = new Audio('/assets/notification.mp3');
            audio.play().catch(error => {
              console.error('[REALTIME] Erro ao tocar som:', error);
            });
            lastSoundPlay.current = now;
          }
          
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

  // Função para buscar rota real via OSRM com rate limiting
  const getRouteFromOSRM = useCallback(async (start: { lat: number; lng: number }, end: { lat: number; lng: number }) => {
    // Evitar chamadas simultâneas
    if (isOSRMCallInProgress.current) {
      console.log('[OSRM SOCORRISTA] Chamada já em progresso, ignorando...');
      return { coords: [], duration: null };
    }
    
    const now = Date.now();
    const timeSinceLastCall = now - lastOSRMCall.current;
    
    if (timeSinceLastCall < MIN_OSRM_INTERVAL) {
      const waitTime = MIN_OSRM_INTERVAL - timeSinceLastCall;
      console.log(`[OSRM SOCORRISTA] Rate limiting: aguardando ${Math.round(waitTime/1000)}s`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    isOSRMCallInProgress.current = true;
    lastOSRMCall.current = Date.now();
    
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
      console.log('[OSRM SOCORRISTA] Fazendo requisição para API...');
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 429) {
          console.warn('[OSRM SOCORRISTA] Rate limit atingido, aguardando 60 segundos...');
          await new Promise(resolve => setTimeout(resolve, 60000));
          throw new Error('Rate limit - tente novamente mais tarde');
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (!data.routes || !data.routes[0]) {
        console.warn('[OSRM SOCORRISTA] Nenhuma rota encontrada');
        return { coords: [], duration: null };
      }
      
      // OSRM retorna [lng, lat], convertemos para {lat, lng}
      const result = {
        coords: data.routes[0].geometry.coordinates.map(([lng, lat]: [number, number]) => ({ lat, lng })),
        duration: data.routes[0].duration // em segundos
      };
      
      console.log('[OSRM SOCORRISTA] Rota calculada com sucesso');
      return result;
    } catch (error) {
      console.error('[OSRM SOCORRISTA] Erro ao buscar rota:', error);
      return { coords: [], duration: null };
    } finally {
      isOSRMCallInProgress.current = false;
    }
  }, [MIN_OSRM_INTERVAL]);

  // Função para atualizar posição no banco de dados
  const atualizarPosicaoNoBanco = useCallback(async (lat: number, lng: number) => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastDBUpdate.current;
    
    // Rate limiting para atualizações do banco
    if (timeSinceLastUpdate < MIN_DB_UPDATE_INTERVAL) {
      console.log(`[GEOLOCATION] Rate limiting DB: aguardando ${Math.round((MIN_DB_UPDATE_INTERVAL - timeSinceLastUpdate)/1000)}s`);
      return;
    }
    
    const url = process.env.REACT_APP_SUPABASE_URL;
    const serviceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY;
    const accessToken = localStorage.getItem('accessToken');
    
    if (!chamado || !url || !serviceKey || !accessToken) {
      console.log('[GEOLOCATION] Dados insuficientes para atualizar banco');
      return;
    }
    
    lastDBUpdate.current = now;
    
    try {
      const timestamp = new Date().toLocaleTimeString();
      console.log(`[GEOLOCATION] ${timestamp} - Atualizando posição no banco: ${lat},${lng}`);
      
      const response = await fetch(`${url}/rest/v1/chamado?id=eq.${chamado.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          posicao_inicial_socorrista: `${lat},${lng}`
        })
      });
      
      if (response.ok) {
        console.log(`[GEOLOCATION] ${timestamp} - ✅ Posição atualizada com sucesso`);
        
        // Atualiza o estado local do chamado
        setChamado(prev => prev ? {
          ...prev,
          posicao_inicial_socorrista: `${lat},${lng}`
        } : null);
      } else {
        console.error(`[GEOLOCATION] ${timestamp} - ❌ Erro HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('[GEOLOCATION] Erro ao atualizar posição:', error);
    }
  }, [chamado, MIN_DB_UPDATE_INTERVAL]);

  // Função para iniciar tracking de geolocalização real
  const iniciarTrackingReal = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError('Geolocalização não suportada neste dispositivo');
      return;
    }
    
    setGeoError(null);
    setTrackingAtivo(true);
    
    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 5000 // Cache de 5 segundos
    };
    
    const id = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        
        console.log(`[GEOLOCATION] Nova posição: ${latitude}, ${longitude} (precisão: ${accuracy}m)`);
        
        // Atualiza posição local imediatamente
        setSocorristaPos({ lat: latitude, lng: longitude });
        
        // Atualiza banco com rate limiting
        atualizarPosicaoNoBanco(latitude, longitude);
      },
      (error) => {
        console.error('[GEOLOCATION] Erro:', error);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGeoError('Permissão de localização negada');
            break;
          case error.POSITION_UNAVAILABLE:
            setGeoError('Localização indisponível');
            break;
          case error.TIMEOUT:
            setGeoError('Timeout na obtenção da localização');
            break;
          default:
            setGeoError('Erro desconhecido na geolocalização');
            break;
        }
        setTrackingAtivo(false);
      },
      options
    );
    
    setWatchId(id);
    console.log('[GEOLOCATION] Tracking iniciado com watchId:', id);
  }, [atualizarPosicaoNoBanco]);

  // Função para parar tracking de geolocalização
  const pararTrackingReal = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
      console.log('[GEOLOCATION] Tracking parado');
    }
    setTrackingAtivo(false);
  }, [watchId]);

  // Iniciar tracking automaticamente quando há chamado
  useEffect(() => {
    if (chamado && !trackingAtivo && !simulacaoAtiva) {
      console.log('[GEOLOCATION] Iniciando tracking automático para chamado:', chamado.id);
      iniciarTrackingReal();
    }
    
    return () => {
      if (trackingAtivo) {
        pararTrackingReal();
      }
    };
  }, [chamado, trackingAtivo, simulacaoAtiva, iniciarTrackingReal, pararTrackingReal]);

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

  // Recalcula rota sempre que a posição do socorrista muda - SEMPRE recalcula com proteção inteligente
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
        console.log(`[ROUTE SOCORRISTA] Posição mudou, recalculando rota...`);
        
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
            console.log(`[ROUTE SOCORRISTA] Rota trimada imediatamente - removidos ${closestIndex} pontos`);
          }
        }
        
        // Debounce de 8 segundos para equilibrar responsividade e rate limiting
        const timer = setTimeout(() => {
          // Só verifica se não há chamada em progresso
          if (!isOSRMCallInProgress.current) {
            getRouteFromOSRM(socorristaPos, destino)
              .then((result) => {
                if (result && result.coords && result.coords.length > 1) {
                  setCurrentRouteCoords(result.coords);
                  console.log('[ROUTE SOCORRISTA] Rota atualizada com sucesso');
                } else {
                  console.log('[ROUTE SOCORRISTA] Nenhuma rota encontrada');
                }
              })
              .catch(() => {
                console.log('[ROUTE SOCORRISTA] Erro ao atualizar rota');
              });
          } else {
            console.log('[ROUTE SOCORRISTA] Chamada OSRM em progresso, tentando novamente em 5s...');
            // Se há chamada em progresso, tenta novamente em 5 segundos
            setTimeout(() => {
              if (!isOSRMCallInProgress.current) {
                getRouteFromOSRM(socorristaPos, destino)
                  .then((result) => {
                    if (result && result.coords && result.coords.length > 1) {
                      setCurrentRouteCoords(result.coords);
                      console.log('[ROUTE SOCORRISTA] Rota atualizada com sucesso (retry)');
                    }
                  })
                  .catch(() => {
                    console.log('[ROUTE SOCORRISTA] Erro ao atualizar rota (retry)');
                  });
              }
            }, 5000);
          }
        }, 8000); // Debounce de 8 segundos
        
        return () => clearTimeout(timer);
      }
    }
  }, [socorristaPos, chamado, getRouteFromOSRM]); // Removido currentRouteCoords para evitar loop

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

  // Função para iniciar simulação de movimento - APENAS PARA TESTES
  const iniciarSimulacao = () => {
    if (!chamado || !chamado.posicao_inicial_socorrista || routeCoords.length < 2) {
      console.log('Não é possível iniciar simulação: dados insuficientes');
      return;
    }

    // Para o tracking real se estiver ativo
    if (trackingAtivo) {
      pararTrackingReal();
      console.log('[SIMULAÇÃO] Tracking real parado para iniciar simulação');
    }

    // Para qualquer simulação em andamento
    if (intervalSimulacao) {
      clearInterval(intervalSimulacao);
    }

    // Encontra a posição atual do socorrista na rota
    const [socorristaLat, socorristaLng] = chamado.posicao_inicial_socorrista.split(',').map(Number);
    let startIndex = 0;
    
    // Encontra o ponto mais próximo na rota
    let minDistance = Infinity;
    for (let i = 0; i < routeCoords.length; i++) {
      const distance = Math.hypot(
        routeCoords[i].lat - socorristaLat,
        routeCoords[i].lng - socorristaLng
      );
      if (distance < minDistance) {
        minDistance = distance;
        startIndex = i;
      }
    }

    console.log(`Iniciando simulação do ponto ${startIndex} de ${routeCoords.length}`);
    
    let currentIndex = startIndex;
    let dbUpdateCounter = 0; // Contador para controlar atualizações do banco
    setSimulacaoAtiva(true);
    
    // Movimentação visual: 2 segundos (~80 km/h)
    const visualIntervalMs = 2000;
    // Atualização do banco: a cada 4 movimentos visuais (2s * 4 = 8s)
    const dbUpdateInterval = 4;

    console.log(`[SIMULAÇÃO MANUAL] Iniciando do ponto ${startIndex}/${routeCoords.length}, movimentação visual: ${visualIntervalMs}ms, banco: ${visualIntervalMs * dbUpdateInterval}ms`);

    const interval = setInterval(async () => {
      currentIndex++;
      dbUpdateCounter++;
      
      if (currentIndex < routeCoords.length) {
        const novaPosicao = routeCoords[currentIndex];
        
        // SEMPRE atualiza a posição visual (mais rápido)
        setSocorristaPos(novaPosicao);
        console.log(`[SIMULAÇÃO VISUAL] Ponto ${currentIndex}/${routeCoords.length} - Lat: ${novaPosicao.lat}, Lng: ${novaPosicao.lng}`);
        
        // SÓ atualiza o banco de dados a cada 4 movimentos visuais (mantém 8s)
        const shouldUpdateDB = dbUpdateCounter >= dbUpdateInterval;
        
        if (shouldUpdateDB) {
          dbUpdateCounter = 0; // Reset do contador
          
          const url = process.env.REACT_APP_SUPABASE_URL;
          const serviceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY;
          const accessToken = localStorage.getItem('accessToken');
          
          if (chamado && url && serviceKey && accessToken) {
            try {
              const timestamp = new Date().toLocaleTimeString();
              console.log(`[PATCH MANUAL] ${timestamp} - Enviando coordenadas para banco: ${novaPosicao.lat},${novaPosicao.lng}`);
              
              const response = await fetch(`${url}/rest/v1/chamado?id=eq.${chamado.id}`, {
                method: 'PATCH',
                headers: {
                  'apikey': serviceKey,
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                  'Prefer': 'return=minimal'
                },
                body: JSON.stringify({
                  posicao_inicial_socorrista: `${novaPosicao.lat},${novaPosicao.lng}`
                })
              });
              
              if (response.ok) {
                console.log(`[PATCH MANUAL] ${timestamp} - ✅ Coordenadas atualizadas com sucesso no banco`);
              } else {
                console.error(`[PATCH MANUAL] ${timestamp} - ❌ Erro HTTP ${response.status}`);
              }
              
              // Atualiza o estado local do chamado
              setChamado(prev => prev ? {
                ...prev,
                posicao_inicial_socorrista: `${novaPosicao.lat},${novaPosicao.lng}`
              } : null);
              
            } catch (error) {
              const timestamp = new Date().toLocaleTimeString();
              console.error(`[PATCH MANUAL] ${timestamp} - ❌ Erro ao atualizar posição na simulação:`, error);
            }
          }
        }
      } else {
        // Chegou ao destino
        console.log('[SIMULAÇÃO MANUAL] ✅ Chegou ao destino - parando simulação');
        clearInterval(interval);
        setSimulacaoAtiva(false);
        setIntervalSimulacao(null);
      }
    }, visualIntervalMs);
    
    setIntervalSimulacao(interval);
  };

  // Função para parar simulação
  const pararSimulacao = () => {
    if (intervalSimulacao) {
      clearInterval(intervalSimulacao);
      setIntervalSimulacao(null);
    }
    setSimulacaoAtiva(false);
    console.log('Simulação interrompida');
    
    // Reinicia o tracking real se há chamado
    if (chamado && !trackingAtivo) {
      console.log('[SIMULAÇÃO] Reiniciando tracking real após parar simulação');
      iniciarTrackingReal();
    }
  };

  // Cleanup quando componente desmonta
  useEffect(() => {
    return () => {
      if (intervalSimulacao) {
        clearInterval(intervalSimulacao);
      }
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [intervalSimulacao, watchId]);

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
        <Typography variant="h6" sx={{ mb: 1, position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Informações do Chamado{chamado ? ` (ID: ${chamado.id})` : ''}</span>
          {/* Botão de simulação - OCULTO mas disponível para testes */}
          {chamado && chamado.posicao_inicial_socorrista && routeCoords.length > 1 && (
            <IconButton
              onClick={simulacaoAtiva ? pararSimulacao : iniciarSimulacao}
              size="small"
              sx={{ 
                ml: 2, 
                color: simulacaoAtiva ? 'error.main' : 'primary.main',
                opacity: 0, // Invisível
                pointerEvents: 'auto', // Mantém clicável
                '&:hover': {
                  opacity: 0.3, // Fica levemente visível no hover para facilitar encontrar
                  backgroundColor: simulacaoAtiva ? 'error.light' : 'primary.light'
                }
              }}
            >
              {simulacaoAtiva ? <StopIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
            </IconButton>
          )}
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
                  onClick={async () => {
                    if (!chamado) return;
                    // If this is a mock chamado, apenas simula
                    if (chamado.id === '123') {
                      setChegou(true);
                      return;
                    }
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
                        body: JSON.stringify({ status: 'Ambulância no local' })
                      });
                      if (!response.ok) {
                        const data = await response.json();
                        throw new Error(data.error_description || data.message || `Erro ${response.status}`);
                      }

                      // Buscar dados atualizados do chamado para o log
                      const chamadoResp = await fetch(`${url}/rest/v1/chamado?id=eq.${chamado.id}`, {
                        headers: {
                          'apikey': serviceKey,
                          'Authorization': `Bearer ${accessToken}`,
                          'Content-Type': 'application/json'
                        }
                      });
                      const chamadoData = await chamadoResp.json();
                      if (chamadoData && chamadoData[0]) {
                        const logData = {
                          chamado_id: chamadoData[0].id,
                          cliente_id: chamadoData[0].cliente_id,
                          localizacao: chamadoData[0].localizacao,
                          endereco_textual: chamadoData[0].endereco_textual,
                          status: chamadoData[0].status,
                          operador_id: chamadoData[0].operador_id,
                          socorrista_id: chamadoData[0].socorrista_id,
                          data_abertura: chamadoData[0].data_abertura,
                          data_fechamento: chamadoData[0].data_fechamento,
                          descricao: chamadoData[0].descricao,
                          prioridade: chamadoData[0].prioridade,
                          notificacao_familiares: chamadoData[0].notificacao_familiares,
                          posicao_inicial_socorrista: chamadoData[0].posicao_inicial_socorrista
                        };
                        await fetch(`${url}/rest/v1/log_chamado`, {
                          method: 'POST',
                          headers: {
                            'apikey': serviceKey,
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'application/json'
                          },
                          body: JSON.stringify(logData)
                        });
                      }

                      setChegou(true);
                    } catch (err: any) {
                      alert('Erro ao atualizar status: ' + (err.message || err));
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                >
                  Cheguei
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  sx={{ minWidth: 120, fontWeight: 600 }}
                  onClick={finalizarAtendimento}
                >
                  Cancelar
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

                      // Buscar dados atualizados do chamado para o log
                      const chamadoResp = await fetch(`${url}/rest/v1/chamado?id=eq.${chamado.id}`, {
                        headers: {
                          'apikey': serviceKey,
                          'Authorization': `Bearer ${accessToken}`,
                          'Content-Type': 'application/json'
                        }
                      });
                      const chamadoData = await chamadoResp.json();
                      if (chamadoData && chamadoData[0]) {
                        const logData = {
                          chamado_id: chamadoData[0].id,
                          cliente_id: chamadoData[0].cliente_id,
                          localizacao: chamadoData[0].localizacao,
                          endereco_textual: chamadoData[0].endereco_textual,
                          status: chamadoData[0].status,
                          operador_id: chamadoData[0].operador_id,
                          socorrista_id: chamadoData[0].socorrista_id,
                          data_abertura: chamadoData[0].data_abertura,
                          data_fechamento: chamadoData[0].data_fechamento,
                          descricao: chamadoData[0].descricao,
                          prioridade: chamadoData[0].prioridade,
                          notificacao_familiares: chamadoData[0].notificacao_familiares,
                          posicao_inicial_socorrista: chamadoData[0].posicao_inicial_socorrista
                        };
                        await fetch(`${url}/rest/v1/log_chamado`, {
                          method: 'POST',
                          headers: {
                            'apikey': serviceKey,
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'application/json'
                          },
                          body: JSON.stringify(logData)
                        });
                      }

                      // Limpar localStorage e redirecionar
                      localStorage.removeItem('chamadoId');
                      console.clear(); // Limpa o console
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

export default EmergencySocorrista; 