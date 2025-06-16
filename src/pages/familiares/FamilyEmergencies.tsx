import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, List, ListItem, ListItemText, CircularProgress, Container, Button, IconButton, Badge } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../Supabase/supabaseRealtimeClient';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';

// Função utilitária para formatar data/hora
function formatarDataHora(data: string) {
  if (!data) return 'N/A';
  const d = new Date(data);
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const ano = d.getFullYear();
  const hora = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dia}/${mes}/${ano} ${hora}:${min}`;
}

interface FamilyEmergenciesProps {
  onNewChamado?: (hasNew: boolean) => void;
}

const FamilyEmergencies: React.FC<FamilyEmergenciesProps> = ({ onNewChamado }) => {
  const [chamados, setChamados] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedChamado, setSelectedChamado] = useState<any | null>(null);
  const [hasNewChamado, setHasNewChamado] = useState(false);
  const navigate = useNavigate();
  const prevChamadosIds = React.useRef<Set<string>>(new Set());
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio('/assets/notification.mp3');
    const unlockAudio = () => {
      if (audioRef.current) {
        audioRef.current.volume = 0;
        audioRef.current.play().catch(() => {});
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.volume = 1;
      }
      window.removeEventListener('click', unlockAudio);
    };
    window.addEventListener('click', unlockAudio);
    return () => {
      window.removeEventListener('click', unlockAudio);
    };
  }, []);

  useEffect(() => {
    const fetchChamados = async () => {
      setLoading(true);
      setErro(null);
      try {
        const familiarId = localStorage.getItem('familiarId') || localStorage.getItem('userId');
        if (!familiarId) throw new Error('ID do familiar não encontrado.');
        const url = process.env.REACT_APP_SUPABASE_URL;
        const serviceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY;
        if (!url || !serviceKey) throw new Error('Supabase URL ou Service Key não definidos');
        const accessToken = localStorage.getItem('userToken');
        const fetchUrl = `${url}/rest/v1/chamado?notificacao_familiares=cs.[{"id":"${familiarId}"}]&status=neq.concluído`;
        const fetchOptions = {
          method: 'GET',
          headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        };
        const response = await fetch(fetchUrl, fetchOptions);
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error_description || data.message || `Erro ${response.status}`);
        }
        const chamadosOrdenados = data.sort((a: any, b: any) => {
          const dataA = new Date(a.data_abertura);
          const dataB = new Date(b.data_abertura);
          return dataB.getTime() - dataA.getTime();
        });
        const currentIds = new Set<string>(chamadosOrdenados.map((chamado: any) => chamado.id));
        const newChamados = chamadosOrdenados.filter((chamado: any) => !prevChamadosIds.current.has(chamado.id));
        if (newChamados.length > 0) {
          if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(() => {});
          }
          setHasNewChamado(true);
          if (onNewChamado) onNewChamado(true);
        }
        prevChamadosIds.current = currentIds;
        setChamados(chamadosOrdenados);
      } catch (e: any) {
        setErro(e.message || 'Erro ao buscar chamados.');
      } finally {
        setLoading(false);
      }
    };
    fetchChamados();
    const channel = supabase
      .channel('public:chamado-family-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chamado' }, (payload) => {
        fetchChamados();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [onNewChamado]);

  const handleVisualizar = (chamado: any) => {
    if (chamado && chamado.id) {
      localStorage.setItem('chamadoId', chamado.id);
      setHasNewChamado(false);
      if (onNewChamado) onNewChamado(false);
      navigate('/emergency-family');
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedChamado(null);
  };

  const handleNotificationClick = () => {
    setHasNewChamado(false);
    if (onNewChamado) onNewChamado(false);
  };

  return (
    <Box sx={{
      width: '100vw',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      position: 'relative',
      overflow: 'hidden',
      bgcolor: 'background.default',
    }}>
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
      <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1, p: 0, pt: 8 }}>
        <Box sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
          maxWidth: 900,
          textAlign: 'center',
          margin: '0 auto',
        }}>
          <Typography variant="h4" gutterBottom>
            Chamados de Emergência
          </Typography>
          <Paper elevation={0} sx={{ mb: 4, p: 3, textAlign: 'center', backgroundColor: 'transparent', boxShadow: 'none', border: 'none', width: '100%' }}>
            <Typography variant="h6">Chamados em que você foi notificado</Typography>
          </Paper>
          {loading ? (
            <CircularProgress />
          ) : erro ? (
            <Typography color="error">{erro}</Typography>
          ) : chamados.length === 0 ? (
            <Typography>Nenhum chamado encontrado.</Typography>
          ) : (
            <List sx={{ width: '100%', maxWidth: 900, margin: '0 auto' }}>
              {chamados.map((chamado) => (
                <Paper
                  key={chamado.id}
                  elevation={2}
                  sx={{ 
                    mb: 2, 
                    backgroundColor: '#fff', 
                    borderRadius: 2,
                    width: '100%',
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    boxShadow: 3
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'primary.main', mb: 0.5 }}>
                      ID: {chamado.id} | Status: <span style={{ color: '#1976d2', fontWeight: 500 }}>{chamado.status}</span>
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>
                      Abertura: {formatarDataHora(chamado.data_abertura)}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      Localização: <span style={{ color: '#333', fontWeight: 500 }}>{chamado.endereco_textual || 'N/A'}</span>
                    </Typography>
                  </Box>
                  <Button 
                    size="small" 
                    color="primary"
                    variant="outlined"
                    onClick={() => handleVisualizar(chamado)}
                    sx={{ ml: { xs: 0, sm: 2 }, mt: { xs: 2, sm: 0 }, whiteSpace: 'nowrap', height: 36 }}
                  >
                    Visualizar
                  </Button>
                </Paper>
              ))}
            </List>
          )}
        </Box>
      </Container>
    </Box>
  );
};

export default FamilyEmergencies; 
