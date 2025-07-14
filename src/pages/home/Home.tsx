import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Container } from '@mui/material';
import {
  Person as ProfileIcon,
  People as FamilyIcon,
  Dashboard as AdminIcon,
} from '@mui/icons-material';
import SOSButton from './SOSButton';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const MenuButton: React.FC<{
  to: string;
  label: string;
  icon: React.ReactNode;
}> = ({ to, label, icon }) => (
  <Link to={to} style={{ textDecoration: 'none' }}>
    <Button
      variant="outlined"
      fullWidth
      sx={{
        py: 2,
        px: 3,
        justifyContent: 'space-between',
        backgroundColor: 'white',
        borderColor: '#e0e0e0',
        color: 'text.primary',
        '&:hover': {
          backgroundColor: '#f5f5f5',
          borderColor: '#e0e0e0',
          transform: 'translateY(-2px)',
          transition: 'transform 0.2s ease-in-out',
        }
      }}
    >
      <Typography variant="body1">{label}</Typography>
      {icon}
    </Button>
  </Link>
);

const Home: React.FC = () => {
  const [localizacao, setLocalizacao] = useState<string>('');
  const [precisao, setPrecisao] = useState<number | null>(null);
  const [fonte, setFonte] = useState<string>('');
  const [erro, setErro] = useState<string>('');
  const [obtendoLocalizacao, setObtendoLocalizacao] = useState<boolean>(false);
  const [buscaAutomatica, setBuscaAutomatica] = useState<boolean>(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const navigate = useNavigate();

  // Configurações de precisão
  const PRECISAO_DESEJADA = 20; // metros
  const TEMPO_ESPERA = 3000; // 3 segundos para cada tentativa
  const INTERVALO_BUSCA = 2000; // 2 segundos entre buscas

  const obterLocalizacao = async (): Promise<void> => {
    if (obtendoLocalizacao) return;
    
    if (!navigator.geolocation) {
      setErro('Seu navegador não suporta geolocalização de alta precisão. Por favor, use um navegador mais recente.');
      return;
    }

    setObtendoLocalizacao(true);
    console.log('Iniciando busca de localização...');

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: TEMPO_ESPERA,
            maximumAge: 0
          }
        );
      });

      const novaPrecisao = position.coords.accuracy;
      const novaLocalizacao = `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`;
      
      console.log('=== Dados da Localização ===');
      console.log(`Timestamp: ${new Date().toISOString()}`);
      console.log(`Coordenadas: ${novaLocalizacao}`);
      console.log(`Precisão atual: ${novaPrecisao.toFixed(2)} metros`);
      console.log(`Precisão desejada: ${PRECISAO_DESEJADA} metros`);
      console.log(`Diferença para precisão desejada: ${(novaPrecisao - PRECISAO_DESEJADA).toFixed(2)} metros`);
      console.log(`Alta precisão atingida: ${novaPrecisao <= PRECISAO_DESEJADA ? 'SIM' : 'NÃO'}`);
      console.log('========================');

      setLocalizacao(novaLocalizacao);
      setPrecisao(novaPrecisao);
      setFonte(novaPrecisao <= PRECISAO_DESEJADA ? 'GPS (Alta Precisão)' : 'GPS');
      setErro('');

      // Se atingiu a precisão desejada, para a busca automática
      if (novaPrecisao <= PRECISAO_DESEJADA) {
        console.log('✅ Precisão ideal atingida, parando busca automática');
        setBuscaAutomatica(false);
      } else {
        console.log(`⏳ Continuando busca. Faltam ${(novaPrecisao - PRECISAO_DESEJADA).toFixed(2)} metros de precisão`);
      }
      
    } catch (error: any) {
      console.error('❌ Erro na obtenção da localização:', error);
      let mensagemErro = 'Erro ao obter localização. ';
      
      if (error.code === 1) {
        mensagemErro += 'Por favor, permita o acesso à sua localização nas configurações do navegador.';
        setBuscaAutomatica(false); // Para a busca automática se não tiver permissão
        console.log('❌ Busca automática parada: Sem permissão de localização');
      } else if (error.code === 2) {
        mensagemErro += 'Serviço de localização indisponível. Verifique se o GPS está ativado.';
        setBuscaAutomatica(false); // Para a busca automática se GPS estiver desativado
        console.log('❌ Busca automática parada: GPS desativado');
      } else if (error.code === 3) {
        mensagemErro += 'Tempo esgotado. Continuando busca...';
        console.log('⚠️ Timeout na busca de localização, tentando novamente...');
      }
      
      setErro(mensagemErro);
      if (error.code === 1 || error.code === 2) {
        setLocalizacao('');
        setPrecisao(null);
        setFonte('');
      }
    } finally {
      setObtendoLocalizacao(false);
    }
  };

  // Função para sincronizar Preferences com localStorage (igual Login.tsx)
  const syncPreferencesToLocalStorage = async () => {
    if (Capacitor.isNativePlatform()) {
      const keysToSync = [
        'accessToken',
        'userToken',
        'userId',
        'userEmail',
        'clienteId',
        'socorristaId',
        'administradorId',
        'familiarId'
      ];
      for (const key of keysToSync) {
        const { value } = await Preferences.get({ key });
        if (value) {
          localStorage.setItem(key, value);
        }
      }
    }
  };

  useEffect(() => {
    const verificarChamadoAberto = async () => {
      // Sincroniza Preferences para localStorage no mobile
      await syncPreferencesToLocalStorage();
      const clienteId = localStorage.getItem('clienteId');
      if (!clienteId) return;

      try {
        const url = process.env.REACT_APP_SUPABASE_URL;
        const serviceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY;
        if (!url || !serviceKey) return;

        // Buscar apenas chamados com status 'Pendente' ou 'Aceito / Em andamento' e criados hoje
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;
        const endpoint = `${url}/rest/v1/chamado?cliente_id=eq.${clienteId}&status=in.(Pendente,"Aceito / Em andamento")&data_abertura=gte.${todayStr}T00:00:00&data_abertura=lte.${todayStr}T23:59:59&order=data_abertura.desc&limit=1`;
        console.log('[Home] Fazendo GET chamado:', endpoint);
        const response = await fetch(
          endpoint,
          {
            headers: {
              'apikey': serviceKey,
              'Authorization': `Bearer ${serviceKey}`,
              'Content-Type': 'application/json',
            },
          }
        );
        const data = await response.json();
        console.log('[Home] Resposta GET chamado:', data);
        if (data && data.length > 0) {
          const chamado = data[0];
          // Salva chamadoId e clienteId no localStorage antes do redirecionamento
          localStorage.setItem('chamadoId', chamado.id.toString());
          localStorage.setItem('clienteId', chamado.cliente_id.toString());
          // Limpa todos os cronômetros antigos do localStorage
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith('cronometro_start_time_')) {
              localStorage.removeItem(key);
            }
          });
          // Ajuste os status conforme sua base
          if (chamado.status !== 'finalizado' && chamado.status !== 'concluído') {
            navigate('/emergency');
          }
        }
      } catch (error) {
        console.error('[Home] Erro ao buscar chamado:', error);
        if (error instanceof Response) {
          error.text().then(text => {
            console.error('[Home] Erro resposta do fetch:', text);
          });
        }
      }
    };

    verificarChamadoAberto();
  }, [navigate]);

  // Inicia/para o intervalo de busca automática
  useEffect(() => {
    // Log da data/hora local ao montar o componente
    const now = new Date();
    const saoPauloTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    console.log('[Home] Data/hora local (America/Sao_Paulo):', saoPauloTime.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }));
    
    if (buscaAutomatica) {
      console.log('🔄 Iniciando busca automática de localização');
      void obterLocalizacao(); // Primeira busca imediata
      intervalRef.current = setInterval(() => {
        void obterLocalizacao();
      }, INTERVALO_BUSCA);
    } else if (intervalRef.current) {
      console.log('⏹️ Parando busca automática de localização');
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Cleanup function
    return () => {
      if (intervalRef.current) {
        console.log('🧹 Limpando intervalo de busca automática');
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [buscaAutomatica]);

  const toggleBuscaAutomatica = () => {
    setBuscaAutomatica(prev => !prev);
  };

  return (
    <Container maxWidth="sm" sx={{ 
      display: 'flex',
      flexDirection: 'column',
      gap: 3,
      position: 'relative',
      overflow: 'hidden',
      p: 0, 
      m: 0, 
      pt: 3,
      minHeight: 'calc(100vh - 64px)',
      mx: 'auto'
    }}>
      {/* Marca d'água */}
      <Box
        component="img"
        src={require('../../assets/Design sem nome (7).png')}
        alt="Marca d'água Support Life"
        sx={{
          position: 'absolute',
          top: '55%',
          left: '50%',
          width: '220%',
          height: '220%',
          objectFit: 'contain',
          opacity: 0.07,
          pointerEvents: 'none',
          zIndex: 0,
          transform: 'translate(-50%, -50%)',
        }}
      />
      {/* Conteúdo principal */}
      <Box sx={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <Typography 
          variant="h4" 
          component="h1" 
          gutterBottom 
          sx={{ fontWeight: 'bold' }}
        >
          Saúde 24 horas
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Pressione o botão SOS para acionar uma ambulância em caso de emergência
        </Typography>
        
        <SOSButton />
        {/* Localização abaixo do botão */}
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Sua localização atual:
          </Typography>
          {localizacao ? (
            <>
              <Typography variant="body2" color="text.primary" sx={{ fontWeight: 'medium' }}>
                {localizacao}
              </Typography>
              {precisao && (
                <Typography variant="caption" color="text.secondary">
                  Precisão: {Math.round(precisao)} metros ({fonte})
                  {buscaAutomatica && ' - Buscando melhor precisão...'}
                </Typography>
              )}
            </>
          ) : (
            <Typography variant="body2" color="error" sx={{ fontWeight: 'medium' }}>
              {obtendoLocalizacao ? 'Obtendo localização...' : 'Localização não disponível'}
            </Typography>
          )}
          {erro && (
            <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
              {erro}
            </Typography>
          )}
          {/* Botões de controle */}
          <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'center' }}>
            {!buscaAutomatica && precisao && precisao > PRECISAO_DESEJADA && (
              <Button
                variant="text"
                size="small"
                onClick={() => {
                  setBuscaAutomatica(true);
                }}
                color="primary"
              >
                Buscar melhor precisão
              </Button>
            )}
          </Box>
        </Box>
      </Box>
    </Container>
  );
};

export default Home; 
