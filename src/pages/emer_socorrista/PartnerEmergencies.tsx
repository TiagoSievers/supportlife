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
    const verificarChamadoAberto = async () => {
      try {
        const url = process.env.REACT_APP_SUPABASE_URL;
        const serviceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY;
        const accessToken = await getStorageValue('accessToken') || await getStorageValue('userToken');
        const socorristaId = await getStorageValue('socorristaId');
        
        if (!url || !serviceKey || !socorristaId || !accessToken) {
          return;
        }

        // Construir data de hoje (mesmo formato do Home.tsx)
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;
        
        // APENAS buscar chamados "A caminho" de hoje
        const endpoint = `${url}/rest/v1/chamado?socorrista_id=eq.${socorristaId}&status=eq.A caminho&data_abertura=gte.${todayStr}T00:00:00&data_abertura=lte.${todayStr}T23:59:59&order=data_abertura.desc&limit=1`;
        
        const response = await fetch(endpoint, {
          headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          return;
        }

        const data = await response.json();
        
        if (Array.isArray(data) && data.length > 0) {
          const chamado = data[0];
          await setStorageValue('chamadoId', chamado.id.toString());
          navigate('/emergencia-socorrista');
        }
        
      } catch (err) {
        // Silencioso
      }
    };

    verificarChamadoAberto();
  }, [navigate]);

  useEffect(() => {
    const fetchAceitos = async () => {
      try {
        const url = process.env.REACT_APP_SUPABASE_URL;
        const serviceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY;
        const accessToken = await getStorageValue('accessToken') || await getStorageValue('userToken');
        const socorristaId = await getStorageValue('socorristaId');
        
        if (!url || !serviceKey || !socorristaId || !accessToken) {
          return;
        }

        // APENAS contar todos os chamados (sem redirecionamento)
        const apiUrl = `${url}/rest/v1/chamado?socorrista_id=eq.${socorristaId}`;
        
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          return;
        }

        const data = await response.json();
        
        if (Array.isArray(data)) {
          setAceitos(data.length);
        }
        
      } catch (error) {
        // Silencioso
      }
    };

    fetchAceitos();
  }, []); // SEM navigate para evitar loops

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
        </Box>
      </Container>
    </>
  );
};

export default PartnerEmergencies;
