import React, { useEffect, useState } from 'react';
import { Container, Typography, Box, Paper } from '@mui/material';
import ChamadoSocorristaList from './chamadoSocorristaList';
import { useNavigate } from 'react-router-dom';
// import Navbar from '../../components/Navbar';

const PartnerEmergencies: React.FC = () => {
  const [aceitos, setAceitos] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    // Lógica de redirecionamento automático para chamado em aberto
    const verificarChamadoAberto = async () => {
      const url = process.env.REACT_APP_SUPABASE_URL;
      const serviceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY;
      const accessToken = localStorage.getItem('accessToken');
      const socorristaId = localStorage.getItem('socorristaId');
      if (!url || !serviceKey || !socorristaId || !accessToken) return;

      // Filtros: status em aberto e do dia
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const todayStr = `${yyyy}-${mm}-${dd}`;
      const endpoint = `${url}/rest/v1/chamado?socorrista_id=eq.${socorristaId}&status=eq.A caminho&data_abertura=gte.${todayStr}T00:00:00&data_abertura=lte.${todayStr}T23:59:59&order=data_abertura.desc&limit=1`;
      console.log('[PartnerEmergencies] Fazendo GET chamado:', endpoint);
      try {
        const response = await fetch(endpoint, {
          headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });
        const data = await response.json();
        console.log('[PartnerEmergencies] Resposta GET chamado:', data);
        if (Array.isArray(data) && data.length > 0) {
          const chamado = data[0];
          console.log('[PartnerEmergencies] Chamado em aberto encontrado:', chamado);
          localStorage.setItem('chamadoId', chamado.id.toString());
          navigate('/emergencia-socorrista');
        } else {
          console.log('[PartnerEmergencies] Nenhum chamado em aberto encontrado.');
        }
      } catch (err) {
        // Opcional: log de erro
        console.error('[PartnerEmergencies] Erro ao buscar chamado em aberto:', err);
      }
    };
    verificarChamadoAberto();
  }, [navigate]);

  useEffect(() => {
    const fetchAceitos = async () => {
      try {
        const url = process.env.REACT_APP_SUPABASE_URL;
        const serviceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY;
        const accessToken = localStorage.getItem('accessToken');
        const socorristaId = localStorage.getItem('socorristaId');

        console.log('=== DEBUG API CHAMADOS ===');
        console.log('URL:', url);
        console.log('socorristaId:', socorristaId);
        console.log('accessToken:', accessToken ? 'Presente' : 'Ausente');
        
        if (!url || !serviceKey || !socorristaId) {
          console.log('Faltando parâmetros:', { url: !!url, serviceKey: !!serviceKey, socorristaId: !!socorristaId });
          return;
        }
        if (!accessToken) {
          console.log('AccessToken não encontrado');
          return;
        }

        const apiUrl = `${url}/rest/v1/chamado?socorrista_id=eq.${socorristaId}`;
        console.log('API URL completa:', apiUrl);
        
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });

        console.log('Status da resposta:', response.status);
        const data = await response.json();
        console.log('Dados recebidos:', data);
        
        if (Array.isArray(data)) {
          console.log('Total de chamados encontrados:', data.length);
          setAceitos(data.length);
          // Nova lógica: se houver chamado "A caminho", redireciona
          const chamadoEmAberto = data.find((c: any) => c.status === 'A caminho');
          if (chamadoEmAberto) {
            console.log('[PartnerEmergencies] Chamado em aberto encontrado (fetchAceitos):', chamadoEmAberto);
            localStorage.setItem('chamadoId', chamadoEmAberto.id.toString());
            navigate('/emergencia-socorrista');
          }
        }
      } catch (error) {
        console.error('Erro na API:', error);
      }
    };
    fetchAceitos();
  }, []);

  return (
    <>
      {/* Navbar removido, pois será controlado pelo App */}
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
          <Paper elevation={0} sx={{ mb: 4, p: 3, textAlign: 'center', backgroundColor: 'transparent', boxShadow: 'none', border: 'none' }}>
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
