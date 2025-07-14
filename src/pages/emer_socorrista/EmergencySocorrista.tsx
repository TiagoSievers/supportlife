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
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

interface Chamado {
  id: string;
  cliente_id: string;
  status: string;
  data_abertura: string;
  localizacao: string;
  posicao_inicial_socorrista?: string;
  endereco_textual?: string;
}

const EmergencySocorrista: React.FC = () => {
  const [chamado, setChamado] = useState<Chamado | null>(null);
  const [endereco, setEndereco] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [routeCoords, setRouteCoords] = useState<{ lat: number; lng: number }[]>([]);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [socorristaPos, setSocorristaPos] = useState({ lat: 0, lng: 0 });
  const [currentRouteCoords, setCurrentRouteCoords] = useState<{ lat: number; lng: number }[]>([]);
  const [routeDuration, setRouteDuration] = useState<number | null>(null);
  const [distanciaRota, setDistanciaRota] = useState<number | null>(null);
  const [tempoEstimado60, setTempoEstimado60] = useState<number | null>(null);
  const [tempoEstimadoSimulacao, setTempoEstimadoSimulacao] = useState<number | null>(null);
  const [chegou, setChegou] = useState(false);
  const [simulacaoAtiva, setSimulacaoAtiva] = useState(false);
  const [intervalSimulacao, setIntervalSimulacao] = useState<NodeJS.Timeout | null>(null);
  const [trackingAtivo, setTrackingAtivo] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const lastSocorristaPos = useRef<{ lat: number; lng: number } | null>(null);
  const lastDBUpdate = useRef<number>(0);
  const MIN_DB_UPDATE_INTERVAL = 8000;
  const navigate = useNavigate();

  // Rate limiting para API OSRM
  const lastOSRMCall = useRef<number>(0);
  const MIN_OSRM_INTERVAL = 30000;
  const isOSRMCallInProgress = useRef<boolean>(false);

  // Função para obter valor do storage (mobile ou web)
  const getStorageValue = async (key: string): Promise<string | null> => {
    if (Capacitor.isNativePlatform()) {
      const { value } = await Preferences.get({ key });
      return value;
    } else {
      return localStorage.getItem(key);
    }
  };

  // Função para salvar valor no storage (mobile ou web)
  const setStorageValue = async (key: string, value: string): Promise<void> => {
    if (Capacitor.isNativePlatform()) {
      await Preferences.set({ key, value });
    } else {
      localStorage.setItem(key, value);
    }
  };

  // Função para remover valor do storage (mobile ou web)
  const removeStorageValue = async (key: string): Promise<void> => {
    if (Capacitor.isNativePlatform()) {
      await Preferences.remove({ key });
    } else {
      localStorage.removeItem(key);
    }
  };

  // Função para cancelar chamado
  const cancelarChamado = async () => {
    if (!chamado) {
      console.error('[CANCELAR] Nenhum chamado encontrado');
      alert('Nenhum chamado encontrado para cancelar');
      return;
    }

    console.log('[CANCELAR] ===== INICIANDO CANCELAMENTO =====');
    console.log('[CANCELAR] Chamado ID:', chamado.id);
    console.log('[CANCELAR] Plataforma:', Capacitor.isNativePlatform() ? 'Mobile Nativo' : 'Web');
    
    // Confirmar cancelamento
    const confirmCancel = window.confirm('Tem certeza que deseja cancelar este chamado?');
    if (!confirmCancel) {
      console.log('[CANCELAR] Cancelamento abortado pelo usuário');
      return;
    }

    setLoading(true);
    
    try {
      // Obter dados do storage
      const url = process.env.REACT_APP_SUPABASE_URL;
      const serviceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY;
      const accessToken = await getStorageValue('accessToken') || await getStorageValue('userToken');
      
      console.log('[CANCELAR] Configurações obtidas:');
      console.log('[CANCELAR] - URL:', url ? 'Configurado' : 'Não configurado');
      console.log('[CANCELAR] - Service Key:', serviceKey ? 'Configurado' : 'Não configurado');
      console.log('[CANCELAR] - Access Token:', accessToken ? 'Encontrado' : 'Não encontrado');
      
      if (!url || !serviceKey) {
        const errorMsg = 'Erro de configuração: Variáveis de ambiente não definidas';
        console.error('[CANCELAR]', errorMsg);
        alert(errorMsg);
        return;
      }
      
      if (!accessToken) {
        const errorMsg = 'Token de acesso não encontrado. Faça login novamente.';
        console.error('[CANCELAR]', errorMsg);
        alert(errorMsg);
        return;
      }

      // Para chamados mock/teste, simular sucesso
      if (chamado.id === 'mock' || chamado.id === 'error') {
        console.log('[CANCELAR] Chamado mock detectado - simulando cancelamento');
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simular delay
        await removeStorageValue('chamadoId');
        console.log('[CANCELAR] ✅ Chamado mock cancelado com sucesso');
        navigate('/partner-emergencies');
        return;
      }
      
      // Construir endpoint
      const endpoint = `${url}/rest/v1/chamado?id=eq.${chamado.id}`;
      console.log('[CANCELAR] Endpoint construído:', endpoint);
      
      // Preparar dados para PATCH
      const patchData = { 
        status: 'finalizado',
        data_fechamento: new Date().toISOString()
      };
      console.log('[CANCELAR] Dados para PATCH:', patchData);
      
      // Headers da requisição
      const headers = {
        'apikey': serviceKey,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      };
      console.log('[CANCELAR] Headers preparados (sem dados sensíveis)');
      
      console.log('[CANCELAR] Fazendo requisição PATCH...');
      
      // Fazer requisição com timeout
      const controller = new AbortController();
      const requestTimeout = setTimeout(() => {
        controller.abort();
        console.error('[CANCELAR] Timeout na requisição (15 segundos)');
      }, 15000);
      
      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: headers,
        body: JSON.stringify(patchData),
        signal: controller.signal
      });
      
      clearTimeout(requestTimeout);
      
      console.log('[CANCELAR] Resposta recebida:');
      console.log('[CANCELAR] - Status:', response.status);
      console.log('[CANCELAR] - Status Text:', response.statusText);
      console.log('[CANCELAR] - OK:', response.ok);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[CANCELAR] Erro na resposta da API:', errorText);
        
        // Tentar fazer parse do JSON de erro
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error_description || errorData.message || errorMessage;
        } catch (parseError) {
          console.warn('[CANCELAR] Não foi possível fazer parse do erro JSON');
        }
        
        alert(`Erro ao cancelar chamado: ${errorMessage}`);
        return;
      }
      
      // Processar resposta de sucesso
      const responseData = await response.json();
      console.log('[CANCELAR] ✅ Chamado finalizado com sucesso!');
      console.log('[CANCELAR] Dados da resposta:', responseData);
      
      // Tentar criar log do chamado
      try {
        console.log('[CANCELAR] Tentando criar log do chamado...');
        const chamadoData = Array.isArray(responseData) ? responseData[0] : responseData;
        
        if (chamadoData && chamadoData.id) {
          const logData = {
            chamado_id: chamadoData.id,
            cliente_id: chamadoData.cliente_id,
            localizacao: chamadoData.localizacao,
            endereco_textual: chamadoData.endereco_textual,
            status: chamadoData.status,
            operador_id: chamadoData.operador_id,
            socorrista_id: chamadoData.socorrista_id,
            data_abertura: chamadoData.data_abertura,
            data_fechamento: chamadoData.data_fechamento,
            descricao: chamadoData.descricao,
            prioridade: chamadoData.prioridade,
            notificacao_familiares: chamadoData.notificacao_familiares,
            posicao_inicial_socorrista: chamadoData.posicao_inicial_socorrista
          };
          
          console.log('[CANCELAR] Dados do log preparados:', logData);
          
          const logResponse = await fetch(`${url}/rest/v1/log_chamado`, {
            method: 'POST',
            headers: {
              'apikey': serviceKey,
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(logData)
          });
          
          if (logResponse.ok) {
            console.log('[CANCELAR] ✅ Log criado com sucesso');
          } else {
            const logErrorText = await logResponse.text();
            console.warn('[CANCELAR] ⚠️ Erro ao criar log:', logErrorText);
          }
        } else {
          console.warn('[CANCELAR] ⚠️ Dados insuficientes para criar log');
        }
      } catch (logError) {
        console.warn('[CANCELAR] ⚠️ Erro ao criar log (não crítico):', logError);
      }
      
      // Limpar storage
      console.log('[CANCELAR] Limpando chamadoId do storage...');
      await removeStorageValue('chamadoId');
      
      // Parar tracking/simulação se ativo
      if (trackingAtivo && watchId !== null) {
        console.log('[CANCELAR] Parando tracking de geolocalização...');
        navigator.geolocation.clearWatch(watchId);
        setTrackingAtivo(false);
      }
      
      if (simulacaoAtiva && intervalSimulacao) {
        console.log('[CANCELAR] Parando simulação...');
        clearInterval(intervalSimulacao);
        setSimulacaoAtiva(false);
      }
      
      console.log('[CANCELAR] ✅ CANCELAMENTO CONCLUÍDO COM SUCESSO!');
      console.log('[CANCELAR] Redirecionando para /partner-emergencies...');
      
      // Mostrar mensagem de sucesso antes de redirecionar
      alert('Chamado cancelado com sucesso!');
      navigate('/partner-emergencies');
      
    } catch (error: any) {
      console.error('[CANCELAR] ❌ ERRO DURANTE CANCELAMENTO:', error);
      
      let errorMessage = 'Erro desconhecido';
      if (error.name === 'AbortError') {
        errorMessage = 'Timeout na requisição. Verifique sua conexão.';
      } else if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage = 'Erro de conexão. Verifique sua internet.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(`Erro ao cancelar chamado: ${errorMessage}`);
    } finally {
      setLoading(false);
      console.log('[CANCELAR] ===== FIM DO PROCESSO DE CANCELAMENTO =====');
    }
  };

  useEffect(() => {
    // Timeout de segurança para garantir que a página carregue
    const loadingTimeout = setTimeout(() => {
      if (loading) {
        console.warn('[EmergencySocorrista] Timeout de carregamento - forçando exibição da interface');
        setLoading(false);
        setPageError('Dados não carregaram completamente, mas a interface está disponível');
      }
    }, 10000); // 10 segundos timeout

    // Buscar chamado real pelo id salvo no storage
    const fetchChamado = async () => {
      try {
        console.log(`[EmergencySocorrista] Plataforma: ${Capacitor.isNativePlatform() ? 'Mobile Nativo' : 'Web'}`);
        console.log(`[EmergencySocorrista] Tentativa ${retryCount + 1} de carregamento`);
        
        const chamadoId = await getStorageValue('chamadoId');
        console.log('[EmergencySocorrista] ChamadoId obtido do storage:', chamadoId);
        
        if (!chamadoId) {
          console.log('[EmergencySocorrista] Nenhum chamadoId encontrado - criando chamado mock para teste');
          // Fallback: criar chamado mock para evitar tela branca
          setChamado({
            id: 'mock',
            cliente_id: '1',
            status: 'A caminho',
            data_abertura: new Date().toISOString(),
            localizacao: '-23.5505,-46.6333', // São Paulo como fallback
            endereco_textual: 'Endereço não disponível - modo offline'
          });
          setLoading(false);
          clearTimeout(loadingTimeout);
          return;
        }

        const url = process.env.REACT_APP_SUPABASE_URL;
        const serviceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY;
        const accessToken = await getStorageValue('accessToken') || await getStorageValue('userToken');
        
        console.log('[EmergencySocorrista] Configurações:', {
          url: !!url,
          serviceKey: !!serviceKey,
          accessToken: !!accessToken
        });

        if (!url || !serviceKey) {
          console.error('[EmergencySocorrista] Variáveis de ambiente não configuradas');
          setPageError('Configuração inválida');
          setLoading(false);
          clearTimeout(loadingTimeout);
          return;
        }

        if (!accessToken) {
          console.error('[EmergencySocorrista] Token de acesso não encontrado');
          setPageError('Token não encontrado');
          setLoading(false);
          clearTimeout(loadingTimeout);
          return;
        }

        const endpoint = `${url}/rest/v1/chamado?id=eq.${chamadoId}`;
        console.log('[EmergencySocorrista] Fazendo requisição para:', endpoint);

        // Timeout para a requisição fetch
        const controller = new AbortController();
        const fetchTimeout = setTimeout(() => {
          controller.abort();
        }, 8000); // 8 segundos timeout para fetch

        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        });

        clearTimeout(fetchTimeout);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[EmergencySocorrista] Erro na resposta da API:', response.status, errorText);
          
          // Fallback em caso de erro da API
          console.log('[EmergencySocorrista] Criando chamado fallback devido a erro da API');
          setChamado({
            id: chamadoId,
            cliente_id: '1',
            status: 'A caminho',
            data_abertura: new Date().toISOString(),
            localizacao: '-23.5505,-46.6333',
            endereco_textual: 'Erro ao carregar endereço'
          });
          setPageError(`Erro da API: ${response.status}`);
          setLoading(false);
          clearTimeout(loadingTimeout);
          return;
        }

        const data = await response.json();
        console.log('[EmergencySocorrista] Dados recebidos:', data);

        if (Array.isArray(data) && data.length > 0) {
          const chamadoData = data[0];
          console.log('[EmergencySocorrista] Chamado carregado:', chamadoData);
          
          // Ordenar por data de criação - mais recente primeiro
          const chamadosOrdenados = data.sort((a: any, b: any) => {
            if (a.data_abertura && b.data_abertura) {
              return new Date(b.data_abertura).getTime() - new Date(a.data_abertura).getTime();
            }
            return (b.id || 0) - (a.id || 0);
          });
          setChamado(chamadosOrdenados[0]);
          setPageError(null);
        } else {
          console.log('[EmergencySocorrista] Nenhum chamado encontrado - criando fallback');
          setChamado({
            id: chamadoId,
            cliente_id: '1',
            status: 'A caminho',
            data_abertura: new Date().toISOString(),
            localizacao: '-23.5505,-46.6333',
            endereco_textual: 'Chamado não encontrado na base de dados'
          });
          setPageError('Chamado não encontrado');
        }
      } catch (error) {
        console.error('[EmergencySocorrista] Erro ao buscar chamado:', error);
        
        // Retry automático até 3 tentativas
        if (retryCount < 2) {
          console.log(`[EmergencySocorrista] Tentando novamente em 3 segundos... (tentativa ${retryCount + 2}/3)`);
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
          }, 3000);
          return;
        }
        
        // Fallback final após tentativas
        const chamadoId = await getStorageValue('chamadoId');
        console.log('[EmergencySocorrista] Criando chamado fallback final após erro');
        setChamado({
          id: chamadoId || 'error',
          cliente_id: '1',
          status: 'A caminho',
          data_abertura: new Date().toISOString(),
          localizacao: '-23.5505,-46.6333',
          endereco_textual: 'Erro de conexão - modo offline'
        });
        setPageError(`Erro de conexão: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      } finally {
        setLoading(false);
        clearTimeout(loadingTimeout);
      }
    };

    fetchChamado();

    return () => {
      clearTimeout(loadingTimeout);
    };
  }, [retryCount]); // Dependência do retryCount para retry automático

  useEffect(() => {
    if (chamado && chamado.localizacao) {
      if (chamado.endereco_textual) {
        setEndereco(chamado.endereco_textual);
      } else {
        setEndereco('Endereço não disponível');
      }
      
      let posicaoInicial;
      if (chamado.posicao_inicial_socorrista) {
        const [socLat, socLng] = chamado.posicao_inicial_socorrista.split(',').map(Number);
        posicaoInicial = { lat: socLat, lng: socLng };
        setSocorristaPos(posicaoInicial);
      }
    }
  }, [chamado]);

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
          {/* Botão de retry manual se houver erro */}
          {pageError && (
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                setRetryCount(0);
                setLoading(true);
                setPageError(null);
              }}
              sx={{ ml: 2 }}
            >
              Tentar Novamente
            </Button>
          )}
        </Typography>

        {/* Alerta de erro se houver */}
        {pageError && (
          <Box sx={{ 
            mb: 2, 
            p: 2, 
            backgroundColor: '#fff3cd', 
            border: '1px solid #ffeaa7',
            borderRadius: 1,
            position: 'relative',
            zIndex: 1
          }}>
            <Typography variant="body2" color="warning.dark">
              ⚠️ {pageError}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              A funcionalidade básica está disponível mesmo com este erro.
            </Typography>
          </Box>
        )}

        {chamado ? (
          <>
            {/* SEMPRE exibe o mapa, mesmo que simples */}
            {(() => {
              let socorristaLat: number | null = null;
              let socorristaLng: number | null = null;
              if (chamado.posicao_inicial_socorrista) {
                const parts = chamado.posicao_inicial_socorrista.split(',');
                if (parts.length === 2) {
                  socorristaLat = Number(parts[0]);
                  socorristaLng = Number(parts[1]);
                }
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
            
            {/* SEMPRE exibe informações básicas */}
            <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4, mt: 2, position: 'relative', zIndex: 1 }}>
              <Typography variant="h5" sx={{ fontWeight: 700, textAlign: 'left', minWidth: 90 }}>
                --:--
              </Typography>
              
              <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                <Typography variant="body1" sx={{ textAlign: 'center', minWidth: 90 }}>
                  --
                </Typography>
              </Box>
              
              <Typography variant="body1" sx={{ textAlign: 'right', minWidth: 90 }}>
                --
              </Typography>
            </Box>
            
            <Typography variant="body2" sx={{ textAlign: 'left', color: 'text.secondary', mt: 1, position: 'relative', zIndex: 1 }}>
              {endereco || chamado.endereco_textual || 'Endereço não disponível'}
            </Typography>

            {/* SEMPRE exibe os botões de ação principais */}
            {!chegou && (
              <Box sx={{ display: 'flex', flexDirection: 'row', gap: 2, mt: 2, width: '100%', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
                <Button
                  variant="contained"
                  color="primary"
                  sx={{ minWidth: 120, fontWeight: 600 }}
                  onClick={async () => {
                    if (!chamado) return;
                    
                    // Para chamados mock/fallback, apenas simula
                    if (chamado.id === 'mock' || chamado.id === 'error') {
                      setChegou(true);
                      return;
                    }
                    
                    const url = process.env.REACT_APP_SUPABASE_URL;
                    const serviceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY;
                    const accessToken = await getStorageValue('accessToken') || await getStorageValue('userToken');
                    
                    if (!url || !serviceKey) {
                      alert('Configuração inválida. Usando modo offline.');
                      setChegou(true);
                      return;
                    }
                    if (!accessToken) {
                      alert('Token não encontrado. Usando modo offline.');
                      setChegou(true);
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
                        console.error('Erro ao atualizar status, mas continuando...');
                        setChegou(true);
                        return;
                      }

                      setChegou(true);
                    } catch (err: any) {
                      console.error('Erro ao atualizar status:', err);
                      setChegou(true); // Continua mesmo com erro
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={20} color="inherit" /> : 'Cheguei'}
                </Button>
                
                <Button
                  variant="outlined"
                  color="error"
                  sx={{ minWidth: 120, fontWeight: 600 }}
                  onClick={cancelarChamado}
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={20} /> : 'Cancelar'}
                </Button>
              </Box>
            )}
            
            {/* Botão de conclusão sempre disponível */}
            {chegou && (
              <Box sx={{ position: 'fixed', left: 0, bottom: 0, width: '100%', zIndex: 2000, display: 'flex', justifyContent: 'center', pb: 2 }}>
                <Button
                  variant="contained"
                  color="success"
                  sx={{ minWidth: 220, fontWeight: 700, fontSize: 18, py: 1.5, borderRadius: 3, boxShadow: 3 }}
                  onClick={async () => {
                    if (!chamado) {
                      navigate('/partner-emergencies');
                      return;
                    }
                    
                    // Para chamados mock/fallback, apenas redireciona
                    if (chamado.id === 'mock' || chamado.id === 'error') {
                      await removeStorageValue('chamadoId');
                      navigate('/partner-emergencies');
                      return;
                    }
                    
                    const url = process.env.REACT_APP_SUPABASE_URL;
                    const serviceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY;
                    const accessToken = await getStorageValue('accessToken') || await getStorageValue('userToken');
                    
                    if (!url || !serviceKey || !accessToken) {
                      await removeStorageValue('chamadoId');
                      navigate('/partner-emergencies');
                      return;
                    }
                    
                    setLoading(true);
                    try {
                      await fetch(`${url}/rest/v1/chamado?id=eq.${chamado.id}`, {
                        method: 'PATCH',
                        headers: {
                          'apikey': serviceKey,
                          'Authorization': `Bearer ${accessToken}`,
                          'Content-Type': 'application/json',
                          'Prefer': 'return=minimal'
                        },
                        body: JSON.stringify({ 
                          status: 'concluído',
                          data_fechamento: new Date().toISOString()
                        })
                      });
                    } catch (err: any) {
                      console.error('Erro ao concluir, mas continuando:', err);
                    } finally {
                      await removeStorageValue('chamadoId');
                      navigate('/partner-emergencies');
                    }
                  }}
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={20} color="inherit" /> : 'Chamado concluído'}
                </Button>
              </Box>
            )}
          </>
        ) : (
          /* Fallback caso não tenha chamado - SEMPRE exibe algo */
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 3, position: 'relative', zIndex: 1 }}>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography variant="body1" color="text.secondary" textAlign="center">
              Carregando informações do chamado...
            </Typography>
            <Button
              variant="outlined"
              onClick={() => navigate('/partner-emergencies')}
              sx={{ mt: 2 }}
            >
              Voltar para Lista de Chamados
            </Button>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default EmergencySocorrista;