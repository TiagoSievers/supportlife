import React, { useEffect, useState, useRef } from 'react';
import { Paper, Typography, Table, TableHead, TableRow, TableCell, TableBody, Box, CircularProgress, Button, useTheme, useMediaQuery } from '@mui/material';
import ChamadoModal from './ChamadoModal';
// Removido import getAddressFromCoords - usando endereco_textual do banco
import { supabase } from '../../Supabase/supabaseRealtimeClient';

export interface Chamado {
  id: string;
  cliente_id: string;
  status: string;
  data_abertura: string;
  localizacao: string;
  endereco_textual?: string;
  posicao_inicial_socorrista?: string;
}

interface ChamadoSocorristaListProps {
  onNewChamado?: () => void;
}

const ChamadoSocorristaList: React.FC<ChamadoSocorristaListProps> = ({ onNewChamado }) => {
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedChamado, setSelectedChamado] = useState<Chamado | null>(null);
  // Removido estado enderecos - usando endereco_textual diretamente do banco
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevChamadosCount = useRef(0);

  const fetchChamados = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = process.env.REACT_APP_SUPABASE_URL;
      const serviceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY;
      const accessToken = localStorage.getItem('accessToken');
      if (!url || !serviceKey) throw new Error('Supabase URL ou Service Key não definidos');
      if (!accessToken) throw new Error('accessToken não encontrado no localStorage');
      
      // Buscar apenas chamados aceitos/em andamento (filtro original restaurado)
      const response = await fetch(`${url}/rest/v1/chamado?status=eq.Aceito%20%2F%20Em%20andamento`, {
        method: 'GET',
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      let data = await response.json();
      if (!response.ok) throw new Error(data.error_description || data.message || `Erro ${response.status}`);
      
      // Ordenar por data_abertura decrescente
      data.sort((a: any, b: any) => {
        if (a.data_abertura && b.data_abertura) {
          return new Date(b.data_abertura).getTime() - new Date(a.data_abertura).getTime();
        }
        return (b.id || 0) - (a.id || 0);
      });

      // Detecta novo chamado na lista filtrada
      if (data.length > prevChamadosCount.current) {
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(() => {});
        }
        if (onNewChamado) onNewChamado();
        console.log('[SOCORRISTA LIST] Novo chamado detectado - notificação ativada');
      }
      prevChamadosCount.current = data.length;

      setChamados(data);
      // Endereços agora vem diretamente do campo endereco_textual do banco
    } catch (err: any) {
      setError(err.message || 'Erro ao buscar chamados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    audioRef.current = new Audio('/assets/notification.mp3');
    // Inicializa o lastMaxIdRef com 0
    prevChamadosCount.current = 0;

    // Desbloqueia o áudio no primeiro clique do usuário
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
    fetchChamados();
    // Realtime subscription
    const channel = supabase
      .channel('public:chamado-socorrista-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chamado' }, (payload) => {
        console.log('[REALTIME SOCORRISTA LIST] Evento detectado:', payload);
        // Sempre recarrega a lista filtrada, nunca adiciona manualmente o chamado
        fetchChamados();
        // Notificação sonora e callback só se for INSERT
        if (payload.eventType === 'INSERT') {
          if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(() => {});
          }
          if (onNewChamado) {
            onNewChamado();
            console.log('[REALTIME SOCORRISTA LIST] onNewChamado chamado');
          }
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line
  }, [onNewChamado]);

  const handleVisualizar = (chamado: Chamado) => {
    setSelectedChamado(chamado);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedChamado(null);
  };

  const handleRecusar = async (chamado: Chamado) => {
    try {
      const url = process.env.REACT_APP_SUPABASE_URL;
      const serviceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY;
      const accessToken = localStorage.getItem('accessToken');
      if (!url || !serviceKey) throw new Error('Supabase URL ou Service Key não definidos');
      if (!accessToken) throw new Error('accessToken não encontrado no localStorage');
      const response = await fetch(`${url}/rest/v1/chamado?id=eq.${chamado.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ status: 'finalizado' })
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error_description || data.message || `Erro ${response.status}`);
      }
      fetchChamados();
    } catch (err) {
      alert('Erro ao finalizar chamado.');
    }
  };

  return (
    <Box sx={{ background: 'transparent', boxShadow: 'none', border: 'none' }}>
      <Typography variant="h6" sx={{ p: 2 }}>
        Lista de Chamados
      </Typography>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2 }}>
          {chamados.map((c) => (
            <Paper key={c.id} sx={{ p: 2, mb: 1, boxShadow: 2 }}>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { sm: 'center' }, gap: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Nº Chamado: {c.id}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ flex: 1, ml: { sm: 2 }, mt: { xs: 1, sm: 0 } }}>
                  {c.endereco_textual || c.localizacao || 'Endereço não informado'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                <span style={{ fontSize: 13 }}>{formatarDataHora(c.data_abertura)}</span>
                <span>
                  <Button
                    size="small"
                    color="primary"
                    onClick={() => handleVisualizar(c)}
                    disabled={c.status === 'finalizado' || c.status === 'concluído'}
                  >
                    Visualizar
                  </Button>
                  <Button size="small" color="error" onClick={() => handleRecusar(c)} sx={{ ml: 1 }}>Recusar</Button>
                </span>
              </Box>
            </Paper>
          ))}
        </Box>
      )}
      <ChamadoModal
        open={modalOpen}
        chamado={selectedChamado}
        onClose={handleCloseModal}
        onFazerAtendimento={() => {}}
      />
    </Box>
  );
};

// Função utilitária para formatar data/hora
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

export default ChamadoSocorristaList; 