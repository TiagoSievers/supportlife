import React, { useEffect, useState } from 'react';
import { Container, Typography, Box, Paper } from '@mui/material';
import ChamadoSocorristaList from './chamadoSocorristaList';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const PartnerEmergencies: React.FC = () => {
  const [aceitos, setAceitos] = useState(0);
  const navigate = useNavigate();

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

  useEffect(() => {
    // Lógica de redirecionamento automático para chamado em aberto
    const verificarChamadoAberto = async () => {
      try {
        console.log(`[PartnerEmergencies] Plataforma: ${Capacitor.isNativePlatform() ? 'Mobile Nativo' : 'Web'}`);
        
        // Obter dados do storage correto
        const url = process.env.REACT_APP_SUPABASE_URL;
        const serviceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY;
        const accessToken = await getStorageValue('accessToken') || await getStorageValue('userToken');
        const socorristaId = await getStorageValue('socorristaId');
        
        console.log('[PartnerEmergencies] Dados obtidos:', {
          url: !!url,
          serviceKey: !!serviceKey,
          socorristaId: !!socorristaId,
          accessToken: !!accessToken
        });
        
        if (!url || !serviceKey || !socorristaId || !accessToken) {
          console.log('[PartnerEmergencies] Parâmetros insuficientes para buscar chamados');
          return;
        }

        // Filtros: status em aberto e do dia
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;
        
        const endpoint = `${url}/rest/v1/chamado?socorrista_id=eq.${socorristaId}&status=eq.A caminho&data_abertura=gte.${todayStr}T00:00:00&data_abertura=lte.${todayStr}T23:59:59&order=data_abertura.desc&limit=1`;
        
        console.log('[PartnerEmergencies] Fazendo GET chamado:', endpoint);
        
        const response = await fetch(endpoint, {
          headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[PartnerEmergencies] Erro na resposta da API:', response.status, errorText);
          return;
        }

        const data = await response.json();
        console.log('[PartnerEmergencies] Resposta GET chamado:', data);
        
        if (Array.isArray(data) && data.length > 0) {
          const chamado = data[0];
          console.log('[PartnerEmergencies] Chamado em aberto encontrado:', chamado);
          
          // Salva o chamadoId no storage correto
          await setStorageValue('chamadoId', chamado.id.toString());
          navigate('/emergencia-socorrista');
        } else {
          console.log('[PartnerEmergencies] Nenhum chamado em aberto encontrado.');
        }
        
      } catch (err) {
        console.error('[PartnerEmergencies] Erro ao buscar chamado em aberto:', err);
      }
    };

    verificarChamadoAberto();
  }, [navigate]);

  useEffect(() => {
    const fetchAceitos = async () => {
      try {
        console.log('[PartnerEmergencies] Iniciando busca de chamados aceitos...');
        
        // Obter dados do storage correto
        const url = process.env.REACT_APP_SUPABASE_URL;
        const serviceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY;
        const accessToken = await getStorageValue('accessToken') || await getStorageValue('userToken');
        const socorristaId = await getStorageValue('socorristaId');

        console.log('=== DEBUG API CHAMADOS ===');
        console.log('Plataforma:', Capacitor.isNativePlatform() ? 'Mobile Nativo' : 'Web');
        console.log('URL:', !!url);
        console.log('socorristaId:', !!socorristaId);
        console.log('accessToken:', !!accessToken);
        
        if (!url || !serviceKey || !socorristaId) {
          console.log('[PartnerEmergencies] Faltando parâmetros:', { 
            url: !!url, 
            serviceKey: !!serviceKey, 
            socorristaId: !!socorristaId 
          });
          return;
        }
        
        if (!accessToken) {
          console.log('[PartnerEmergencies] AccessToken não encontrado');
          return;
        }

        const apiUrl = `${url}/rest/v1/chamado?socorrista_id=eq.${socorristaId}`;
        console.log('[PartnerEmergencies] API URL completa:', apiUrl);
        
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });

        console.log('[PartnerEmergencies] Status da resposta:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('[PartnerEmergencies] Erro na resposta:', response.status, errorText);
          return;
        }

        const data = await response.json();
        console.log('[PartnerEmergencies] Dados recebidos:', data);
        
        if (Array.isArray(data)) {
          console.log('[PartnerEmergencies] Total de chamados encontrados:', data.length);
          setAceitos(data.length);
          
          // Nova lógica: se houver chamado "A caminho", redireciona
          const chamadoEmAberto = data.find((c: any) => c.status === 'A caminho');
          if (chamadoEmAberto) {
            console.log('[PartnerEmergencies] Chamado em aberto encontrado (fetchAceitos):', chamadoEmAberto);
            await setStorageValue('chamadoId', chamadoEmAberto.id.toString());
            navigate('/emergencia-socorrista');
          }
        } else {
          console.log('[PartnerEmergencies] Resposta não é um array:', typeof data);
        }
        
      } catch (error) {
        console.error('[PartnerEmergencies] Erro na API:', error);
      }
    };

    fetchAceitos();
  }, [navigate]);

  return (
    <>
      <Container
        maxWidth="lg"
        sx={{
          py: 4,
          px: 0,
          mx: 'auto',
          position: 'relative',
          overflow: 'hidden',
          minHeight: 'calc(100vh - 64px)'
        }}
      >
        {/* Marca d'água */}
        <Box
          component="img"
          src={require('../../assets/Design sem nome (7).png')}
          alt="Marca d'água Support Life"
          sx={{
            position: 'absolute',
            top: '30%',
            left: '50%',
            width: '180%',
            height: '180%',
            objectFit: 'contain',
            opacity: 0.07,
            pointerEvents: 'none',
            zIndex: 0,
            transform: 'translate(-50%, -50%)',
          }}
        />
        
        {/* Conteúdo principal */}
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Typography variant="h4" gutterBottom>
            Chamados de Emergência
          </Typography>
          
          <Paper elevation={0} sx={{ 
            mb: 4, 
            p: 3, 
            textAlign: 'center', 
            backgroundColor: 'transparent', 
            boxShadow: 'none', 
            border: 'none' 
          }}>
            <Typography variant="h6">Chamados aceitos pelo socorrista</Typography>
            <Typography variant="h3" color="primary">{aceitos}</Typography>
          </Paper>
          
          <ChamadoSocorristaList />
          
          {/* Debug info - só aparece em desenvolvimento */}
          {process.env.NODE_ENV === 'development' && (
            <Box sx={{ mt: 2, p: 1, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Debug: Plataforma - {Capacitor.isNativePlatform() ? 'Mobile Nativo' : 'Web'}
              </Typography>
            </Box>
          )}
        </Box>
      </Container>
    </>
  );
};

export default PartnerEmergencies;