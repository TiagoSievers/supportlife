import React, { useEffect, useState, useRef } from 'react';
import { Paper, Typography, Table, TableHead, TableRow, TableCell, TableBody, Box, CircularProgress, Button, useTheme, useMediaQuery } from '@mui/material';
import ChamadoModal from './ChamadoModal';
// Removido import getAddressFromCoords - usando endereco_textual do banco
import { supabase } from '../../Supabase/supabaseRealtimeClient';

// Função para ativar o sino no Navbar
const ativarSinoNotificacao = () => {
  // Emitir um evento customizado que o Navbar vai escutar
  const event = new CustomEvent('novaNotificacao');
  window.dispatchEvent(event);
};

export interface Chamado {
  id: string;
  cliente_id: string;
  status: string;
  data_abertura: string;
  localizacao: string;
  endereco_textual?: string;
  posicao_inicial_socorrista?: string;
}

const ChamadoSocorristaList: React.FC = () => {
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedChamado, setSelectedChamado] = useState<Chamado | null>(null);
  // Removido estado enderecos - usando endereco_textual diretamente do banco
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

      setChamados(data);
      // Endereços agora vem diretamente do campo endereco_textual do banco
    } catch (err: any) {
      setError(err.message || 'Erro ao buscar chamados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChamados();
    // Realtime subscription
    const channel = supabase
      .channel('public:chamado-socorrista-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chamado' }, (payload: any) => {
        console.log('[REALTIME SOCORRISTA LIST] Evento detectado:', payload);
        
        // Verificar se o status é "Aceito / Em andamento"
        if (payload.new && payload.new.status === 'Aceito / Em andamento') {
          console.log('notificação');
          // Ativar o sino no Navbar
          ativarSinoNotificacao();
          // Tocar som de notificação
          if (audioRef.current) {
            audioRef.current.play().catch(err => console.error('Erro ao tocar som:', err));
          }
          // Sempre recarrega a lista filtrada
          fetchChamados();
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleVisualizar = async (chamado: Chamado) => {
    try {
      const url = process.env.REACT_APP_SUPABASE_URL;
      const serviceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY;
      const accessToken = localStorage.getItem('accessToken');
      if (!url || !serviceKey) throw new Error('Supabase URL ou Service Key não definidos');
      if (!accessToken) throw new Error('accessToken não encontrado no localStorage');

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
          status: "Visualizado",
          operador_id: chamadoData[0].operador_id,
          socorrista_id: localStorage.getItem('socorristaId'),
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
    } catch (err) {
      console.error('Erro ao criar log de visualização:', err);
    }

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
      
      // Atualizar status para finalizado
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
          status: "Visualizado",
          operador_id: chamadoData[0].operador_id,
          socorrista_id: localStorage.getItem('socorristaId'),
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

      fetchChamados();
    } catch (err) {
      alert('Erro ao finalizar chamado.');
    }
  };

  return (
    <Box sx={{ background: 'transparent', boxShadow: 'none', border: 'none' }}>
      <audio ref={audioRef} src={`${process.env.PUBLIC_URL}/assets/notification.mp3`} />
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
                  <Button size="small" color="error" onClick={() => handleRecusar(c)} sx={{ ml: 1, display: 'none' }}>Recusar</Button>
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