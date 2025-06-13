import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Paper, 
  List, 
  ListItem,
  ListItemText,
  IconButton,
  Snackbar,
  Alert,
  Chip,
  CircularProgress
} from '@mui/material';
import {
  People as FamilyIcon,
  LocationOn as LocationOnIcon,
  Phone as PhoneIcon
} from '@mui/icons-material';
import MapClient from './MapClient';
import { useNavigate } from 'react-router-dom';
import Cronometro from './Cronometro';
import { buscarFamiliares } from '../familiares/api';
import type { FamilyMember } from '../familiares/FamilyMemberDialog';
import { supabase } from '../../Supabase/supabaseRealtimeClient';
import { calcularDistanciaTotalKm } from './MapClient';


interface Chamado {
  id: string;
  cliente_id: string;
  status: string;
  localizacao: string;
  endereco_textual?: string;
  data_abertura: string;
  notificacao_familiares?: any[];
  socorrista_id?: string;
  posicao_inicial_socorrista?: string;
}

// Interface Location não é mais necessária aqui
/*
interface Location {
  lat: number;
  lng: number;
  address: string;
}
*/

// Removido fallback - usar apenas dados do banco

const Emergency: React.FC = () => {
  const [startTime] = useState(new Date().toLocaleTimeString());
  const [estimatedTime] = useState('15 minutos');

  const [familyContacts, setFamilyContacts] = useState<FamilyMember[]>([]);

  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info' | 'warning' 
  });

  const [chamado, setChamado] = useState<Chamado | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notificados, setNotificados] = useState<string[]>([]);
  const [socorristaMarker, setSocorristaMarker] = useState<{ lat: number, lng: number } | null>(null);

  // Novos estados para rota e timing (como EmergencyFamily)
  const [routeCoords, setRouteCoords] = useState<{ lat: number; lng: number }[]>([]);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [socorristaPos, setSocorristaPos] = useState<{ lat: number; lng: number } | null>(null);
  const [currentRouteCoords, setCurrentRouteCoords] = useState<{ lat: number; lng: number }[]>([]);
  const [routeDuration, setRouteDuration] = useState<number | null>(null);
  const [distanciaRota, setDistanciaRota] = useState<number | null>(null);
  const [tempoEstimado60, setTempoEstimado60] = useState<number | null>(null);
  const [tempoEstimadoSimulacao, setTempoEstimadoSimulacao] = useState<number | null>(null);

  // Rate limiting para API OSRM (como EmergencyFamily)
  const lastOSRMCall = useRef<number>(0);
  const MIN_OSRM_INTERVAL = 30000; // 30 segundos entre chamadas
  const routeCache = useRef<Map<string, any>>(new Map());
  const isOSRMCallInProgress = useRef<boolean>(false);
  const lastRouteRecalculation = useRef<number>(0);
  const MIN_RECALCULATION_INTERVAL = 15000; // 15 segundos mínimo entre recálculos
  const lastSocorristaPos = useRef<{ lat: number; lng: number } | null>(null);

  const navigate = useNavigate();

  // Função para buscar rota real via OSRM com rate limiting (como EmergencyFamily)
  const getRouteFromOSRM = useCallback(async (start: { lat: number; lng: number }, end: { lat: number; lng: number }) => {
    if (isOSRMCallInProgress.current) {
      console.log('[OSRM EMERGENCY] Chamada já em progresso, ignorando...');
      return { coords: [], duration: null };
    }
    
    const cacheKey = `${start.lat.toFixed(3)},${start.lng.toFixed(3)}-${end.lat.toFixed(3)},${end.lng.toFixed(3)}`;
    
    if (routeCache.current.has(cacheKey)) {
      console.log('[OSRM EMERGENCY] Usando rota do cache');
      return routeCache.current.get(cacheKey);
    }
    
    const now = Date.now();
    const timeSinceLastCall = now - lastOSRMCall.current;
    
    if (timeSinceLastCall < MIN_OSRM_INTERVAL) {
      const waitTime = MIN_OSRM_INTERVAL - timeSinceLastCall;
      console.log(`[OSRM EMERGENCY] Rate limiting: aguardando ${Math.round(waitTime/1000)}s`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    isOSRMCallInProgress.current = true;
    lastOSRMCall.current = Date.now();
    
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
      console.log('[OSRM EMERGENCY] Fazendo requisição para API...');
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 429) {
          console.warn('[OSRM EMERGENCY] Rate limit atingido, aguardando 60 segundos...');
          await new Promise(resolve => setTimeout(resolve, 60000));
          throw new Error('Rate limit - tente novamente mais tarde');
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (!data.routes || !data.routes[0]) {
        console.warn('[OSRM EMERGENCY] Nenhuma rota encontrada');
        return { coords: [], duration: null };
      }
      
      const result = {
        coords: data.routes[0].geometry.coordinates.map(([lng, lat]: [number, number]) => ({ lat, lng })),
        duration: data.routes[0].duration
      };
      
      const variations = [
        cacheKey,
        `${start.lat.toFixed(2)},${start.lng.toFixed(2)}-${end.lat.toFixed(2)},${end.lng.toFixed(2)}`,
        `${start.lat.toFixed(4)},${start.lng.toFixed(4)}-${end.lat.toFixed(4)},${end.lng.toFixed(4)}`
      ];
      
      variations.forEach(key => {
        routeCache.current.set(key, result);
      });
      
      console.log('[OSRM EMERGENCY] Rota salva no cache com múltiplas variações');
      return result;
    } catch (error) {
      console.error('[OSRM EMERGENCY] Erro ao buscar rota:', error);
      return { coords: [], duration: null };
    } finally {
      isOSRMCallInProgress.current = false;
    }
  }, [MIN_OSRM_INTERVAL]);

  // Buscar chamado inicial e configurar realtime (como EmergencyFamily)
  useEffect(() => {
    const fetchChamadoInicial = async () => {
      setLoading(true);
      setError(null);
      try {
      const clienteId = localStorage.getItem('clienteId');
      if (!clienteId) throw new Error('Cliente não identificado');
        
        const { data, error } = await supabase
          .from('chamado')
          .select('*')
          .eq('cliente_id', clienteId)
          .order('data_abertura', { ascending: false })
          .limit(1);
        
        if (error) throw error;
        
        const chamadoAtual = data?.[0] || null;
        setChamado(chamadoAtual);
        
        console.log('[EMERGENCY] Dados completos do chamado:', {
          id: chamadoAtual?.id,
          localizacao: chamadoAtual?.localizacao,
          endereco_textual: chamadoAtual?.endereco_textual,
          status: chamadoAtual?.status,
          socorrista_id: chamadoAtual?.socorrista_id,
          posicao_inicial_socorrista: chamadoAtual?.posicao_inicial_socorrista
        });
        
        if (chamadoAtual?.socorrista_id && chamadoAtual?.posicao_inicial_socorrista) {
          const [lat, lng] = chamadoAtual.posicao_inicial_socorrista.split(',').map(Number);
          setSocorristaPos({ lat, lng });
          console.log('[EMERGENCY] Posição socorrista definida:', { lat, lng });
        }
        
        console.log('[EMERGENCY] Chamado inicial carregado:', chamadoAtual?.id);
    } catch (err: any) {
      setError(err.message || 'Erro ao buscar chamado');
      setChamado(null);
    } finally {
      setLoading(false);
    }
  };

    fetchChamadoInicial();
  }, []);

  // Realtime subscription para mudanças no chamado (como EmergencyFamily)
  useEffect(() => {
    const clienteId = localStorage.getItem('clienteId');
    if (!clienteId) return;

    console.log('[EMERGENCY] Configurando subscription realtime...');
    
    const subscription = supabase
      .channel('emergency-chamado-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chamado',
          filter: `cliente_id=eq.${clienteId}`
        },
        (payload) => {
          console.log('[EMERGENCY] Mudança no chamado via realtime:', payload);
          
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const novoChamado = payload.new as Chamado;
            setChamado(novoChamado);
            
            // Atualiza posição do socorrista se mudou
            if (novoChamado.socorrista_id && novoChamado.posicao_inicial_socorrista) {
              const [lat, lng] = novoChamado.posicao_inicial_socorrista.split(',').map(Number);
              setSocorristaPos({ lat, lng });
              console.log('[EMERGENCY] Posição socorrista atualizada via realtime:', { lat, lng });
            }
          }
        }
      )
      .subscribe();

    return () => {
      console.log('[EMERGENCY] Removendo subscription realtime');
      subscription.unsubscribe();
    };
  }, []);

  // Recalcula rota sempre que a posição do socorrista muda (como EmergencyFamily)
  useEffect(() => {
    if (chamado && chamado.localizacao && socorristaPos) {
      const [lat, lon] = chamado.localizacao.split(',').map(Number);
      const destino = { lat, lng: lon };
      
      // Verifica se a posição mudou significativamente
      if (lastSocorristaPos.current) {
        const distanciaChange = Math.hypot(
          (socorristaPos.lat - lastSocorristaPos.current.lat) * 111000,
          (socorristaPos.lng - lastSocorristaPos.current.lng) * 111000 * Math.cos(socorristaPos.lat * Math.PI / 180)
        );
        
        if (distanciaChange < 50) { // Menos de 50m, não recalcula
          return;
        }
      }
      
      lastSocorristaPos.current = socorristaPos;
      
      console.log('[EMERGENCY] Posição do socorrista mudou, recalculando rota...', {
        socorrista: socorristaPos,
        destino: destino
      });
      
      // Trimming imediato da rota atual
      if (currentRouteCoords.length > 0) {
        const remainingRoute = currentRouteCoords.filter(point => {
          const distance = Math.hypot(
            (point.lat - socorristaPos.lat) * 111000,
            (point.lng - socorristaPos.lng) * 111000 * Math.cos(socorristaPos.lat * Math.PI / 180)
          );
          return distance > 100; // Remove pontos a menos de 100m
        });
        
        if (remainingRoute.length !== currentRouteCoords.length) {
          console.log('[EMERGENCY] Trimming imediato: removidos', currentRouteCoords.length - remainingRoute.length, 'pontos');
          setCurrentRouteCoords(remainingRoute);
        }
      }
      
      // Debounce para recálculo completo
      const timer = setTimeout(async () => {
        const now = Date.now();
        const timeSinceLastRecalc = now - lastRouteRecalculation.current;
        
        if (timeSinceLastRecalc < MIN_RECALCULATION_INTERVAL) {
          console.log('[EMERGENCY] Recálculo muito recente, aguardando...');
          return;
        }
        
        lastRouteRecalculation.current = now;
        setLoadingRoute(true);
        
        try {
          console.log('[EMERGENCY] Iniciando recálculo OSRM...', { from: socorristaPos, to: destino });
          const result = await getRouteFromOSRM(socorristaPos, destino);
          if (result.coords.length > 0) {
            console.log('[EMERGENCY] Rota OSRM recebida:', result.coords.length, 'pontos');
            setCurrentRouteCoords(result.coords);
            setRouteDuration(result.duration);
            
            const distancia = calcularDistanciaTotalKm(result.coords);
            setDistanciaRota(distancia);
            
            // Estimativas de tempo
            const tempo60 = distancia ? (distancia / 60) * 60 : null;
            const tempoSimulacao = result.coords.length * 8; // 8s por ponto
            
            setTempoEstimado60(tempo60);
            setTempoEstimadoSimulacao(tempoSimulacao);
            
            console.log('[EMERGENCY] Rota recalculada:', {
              pontos: result.coords.length,
              distancia: distancia?.toFixed(2) + 'km',
              tempo60: tempo60 ? Math.round(tempo60) + 'min' : null,
              tempoSimulacao: Math.round(tempoSimulacao / 60) + 'min'
            });
          } else {
            console.warn('[EMERGENCY] OSRM retornou rota vazia');
          }
        } catch (error) {
          console.error('[EMERGENCY] Erro ao recalcular rota:', error);
        } finally {
          setLoadingRoute(false);
        }
      }, 8000); // 8 segundos de debounce
      
      return () => clearTimeout(timer);
    }
  }, [socorristaPos, chamado, getRouteFromOSRM]);

  // Atualiza marcador do socorrista quando posição muda
  useEffect(() => {
    if (socorristaPos) {
      setSocorristaMarker(socorristaPos);
    }
  }, [socorristaPos]);



  // Endereço agora vem diretamente do banco de dados via chamado.endereco_textual

  // Buscar familiares reais ao montar
  useEffect(() => {
    buscarFamiliares()
      .then((familiares) => {
        const members = familiares
          .filter((f: any) => !f.deletado)
          .map((f: any) => ({
            id: f.id?.toString() || '',
            name: f.nome,
            relationship: f.parentesco,
            phone: f.telefone,
            email: f.email,
            isEmergencyContact: f.contato_emergencia || false,
          }));
        setFamilyContacts(members);
      })
      .catch(() => setFamilyContacts([]));
  }, []);

  const handleNotificar = (member: FamilyMember) => {
    setNotificados((prev) => [...prev, member.id]);
    setNotification({
      open: true,
      message: `Familiar ${member.name} notificado com sucesso!`,
      severity: 'success'
    });
  };

  const notifyAllContacts = () => {
    setNotification({
      open: true,
      message: 'Todos os familiares foram notificados!',
      severity: 'success'
    });
     // Adicionar lógica real de notificação aqui
  };

  const finishEmergency = () => {
    try {
      setNotification({
        open: true,
        message: 'Emergência finalizada com sucesso!',
        severity: 'info'
      });
      setTimeout(() => {
        navigate('/home');
      }, 1500);
    } catch (error) {
      setNotification({
        open: true,
        message: 'Erro ao finalizar emergência.',
        severity: 'error'
      });
    }
  };

 const handleCloseNotification = (event?: React.SyntheticEvent | Event, reason?: string) => {
   if (reason === 'clickaway') {
     return;
   }
   setNotification(prev => ({ ...prev, open: false }));
 };

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
    }}>
      {/* Marca d'água */}
      <Box
        component="img"
        src={require('../../assets/Design sem nome (7).png')}
        alt="Marca d'água Support Life"
        sx={{
          position: 'absolute',
          top: '20%',
          left: '50%',
          width: '140%',
          height: '140%',
          objectFit: 'contain',
          opacity: 0.07,
          pointerEvents: 'none',
          zIndex: 0,
          transform: 'translate(-50%, -50%)',
        }}
      />
      {/* Conteúdo principal */}
      <Box sx={{ position: 'relative', zIndex: 1 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ textAlign: 'center' }}>
        Emergência Ativa{chamado && chamado.id ? ` #${chamado.id}` : ''}
      </Typography>

      {/* Card de Status */}
      <Paper elevation={0} sx={{ borderRadius: 2, backgroundColor: 'transparent', boxShadow: 'none', border: 'none' }}>
         <Box sx={{
           display: 'flex',
           alignItems: 'center',
           gap: 2,
           mb: 3,
           flexWrap: 'wrap',
         }}>
           <LocationOnIcon color="error" sx={{ fontSize: 28 }} />
           <Typography variant="h6" sx={{ flex: 1 }}>
             Status da Emergência
           </Typography>
           {loading ? (
             <CircularProgress size={24} />
           ) : chamado ? (
             <Chip
               label={chamado.status}
               color={
                 chamado.status === 'finalizado'
                   ? 'default'
                   : chamado.status === 'aceito' || chamado.status === 'em andamento'
                   ? 'success'
                   : 'warning'
               }
               sx={{ fontWeight: 500, maxWidth: 180, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
             />
           ) : null}
         </Box>

         <Box sx={{ mb: 2 }}>
           {loading ? (
             <Typography>Carregando informações do chamado...</Typography>
           ) : chamado ? (
             <>
               <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, alignItems: 'center' }}>
                 <Box sx={{ textAlign: 'left' }}>
                   <Typography color="text.secondary" variant="body2" gutterBottom>
                     Horário de Abertura
                   </Typography>
                   <Typography variant="h6">
                     {new Date(chamado.data_abertura).toLocaleString()}
                   </Typography>
                 </Box>
                 <Box>
                   <Typography color="text.secondary" variant="body2" gutterBottom>
                     Cronômetro
                   </Typography>
                   <Typography variant="h6">
                     {chamado?.data_abertura && <Cronometro startDate={chamado.data_abertura} />}
                   </Typography>
                 </Box>
               </Box>
               <Box sx={{ mt: 2 }}>
                 <Typography color="text.secondary" variant="body2" gutterBottom>
                   Localização
                 </Typography>
                 <Typography variant="body2">
                   {chamado.endereco_textual || chamado.localizacao || 'Não informada'}
                 </Typography>
               </Box>
             </>
           ) : (
             <Typography color="error">Nenhum chamado encontrado para este cliente.</Typography>
           )}
         </Box>
      </Paper>

      {/* Renderização do Mapa usando MapClient */}
      <Box sx={{ mb: 3 }}>
{chamado?.localizacao ? (() => {
          const centerCoords = {
            lat: Number(chamado.localizacao.split(',')[0]),
            lng: Number(chamado.localizacao.split(',')[1])
          };
          
          const patientCoords = {
            lat: Number(chamado.localizacao.split(',')[0]),
            lng: Number(chamado.localizacao.split(',')[1])
          };
          
          console.log('[EMERGENCY] Coordenadas do mapa:', {
            center: centerCoords,
            patient: patientCoords,
            ambulance: socorristaMarker,
            chamadoLocalizacao: chamado.localizacao
          });
          
          return (
            <MapClient
              center={centerCoords}
              zoom={15}
              ambulancePosition={socorristaMarker || undefined}
              routeCoords={currentRouteCoords}
              patientPosition={patientCoords}
            />
          );
        })() : (
          <div>Carregando localização do chamado...</div>
        )}
      </Box>
      
      {/* Informações da Rota e Estimativas */}
      {(loadingRoute || distanciaRota || tempoEstimado60) && (
        <Paper elevation={0} sx={{ borderRadius: 2, backgroundColor: 'transparent', boxShadow: 'none', border: 'none', mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Informações da Rota
          </Typography>
          
          {loadingRoute && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <CircularProgress size={16} />
              <Typography variant="body2" color="text.secondary">
                Calculando rota...
              </Typography>
            </Box>
          )}
          
          {distanciaRota && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Distância: <strong>{distanciaRota.toFixed(1)} km</strong>
              </Typography>
            </Box>
          )}
          
          {tempoEstimado60 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Tempo estimado (60 km/h): <strong>{Math.round(tempoEstimado60)} minutos</strong>
              </Typography>
            </Box>
          )}
          
          {tempoEstimadoSimulacao && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Tempo de simulação: <strong>{Math.round(tempoEstimadoSimulacao / 60)} minutos</strong>
              </Typography>
            </Box>
          )}
          
          {currentRouteCoords.length > 0 && (
            <Typography variant="body2" color="text.secondary">
              Pontos da rota: {currentRouteCoords.length}
            </Typography>
          )}
      </Paper>
      )}
      
      {/* Card de Notificar Familiares */}
      <Paper elevation={0} sx={{ borderRadius: 2, backgroundColor: 'transparent', boxShadow: 'none', border: 'none' }}>
         <Box sx={{
           display: 'flex',
           alignItems: 'center',
           gap: 2,
           mb: 1
         }}>
           <FamilyIcon sx={{ fontSize: 28, color: 'text.primary' }} />
           <Typography variant="body1" sx={{ fontWeight: 400, color: 'text.primary' }}>
             Familiares
           </Typography>
         </Box>
         
         <List sx={{ mb: 2 }}>
           {familyContacts.length === 0 ? (
             <Typography color="text.secondary" sx={{ px: 2, py: 1 }}>Nenhum familiar cadastrado.</Typography>
           ) : (
             familyContacts.map((member) => {
               // Verifica se o familiar está na lista de notificados do chamado
               const jaNotificado = chamado && Array.isArray(chamado.notificacao_familiares) && chamado.notificacao_familiares.some((f: any) => f.id === member.id);
               return (
                 <ListItem
                   key={member.id}
                   sx={{ borderBottom: '1px solid #eee', '&:last-child': { borderBottom: 'none' } }}
                   secondaryAction={
                     jaNotificado ? (
                       <Box sx={{
                         backgroundColor: 'primary.main',
                         color: 'white',
                         px: 2,
                         py: 0.5,
                         borderRadius: 2,
                         fontWeight: 500,
                         fontSize: '0.95rem',
                         display: 'inline-block',
                         minWidth: 90,
                         textAlign: 'center',
                       }}>
                         Notificado
                       </Box>
                     ) : (
                       <Box sx={{
                         backgroundColor: '#e0e0e0',
                         color: '#222',
                         px: 2,
                         py: 0.5,
                         borderRadius: 2,
                         fontWeight: 500,
                         fontSize: '0.95rem',
                         display: 'inline-block',
                         minWidth: 90,
                         textAlign: 'center',
                       }}>
                         Notificar
                       </Box>
                     )
                   }
                 >
                   <ListItemText
                     primary={member.name}
                     secondary={member.phone}
                   />
                 </ListItem>
               );
             })
           )}
         </List>

         <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
           <Button
             variant="outlined"
             color="error"
             fullWidth
             onClick={finishEmergency}
           >
             Finalizar Emergência
           </Button>
           <Box sx={{ pb: 2 }} />
         </Box>
      </Paper>
      </Box>

      {/* Snackbar para notificações */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Emergency; 