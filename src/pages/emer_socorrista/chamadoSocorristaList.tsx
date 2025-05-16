import React, { useEffect, useState } from 'react';
import { Paper, Typography, Table, TableHead, TableRow, TableCell, TableBody, Box, CircularProgress, Button, useTheme, useMediaQuery } from '@mui/material';
import ChamadoModal from './ChamadoModal';
import { getAddressFromCoords } from './getAddressFromCoordsSocorrista';
import { supabase } from '../../Supabase/supabaseRealtimeClient';

export interface Chamado {
  id: string;
  cliente_id: string;
  status: string;
  data_abertura: string;
  localizacao: string;
}

const ChamadoSocorristaList: React.FC = () => {
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedChamado, setSelectedChamado] = useState<Chamado | null>(null);
  const [enderecos, setEnderecos] = useState<{ [id: string]: string | null }>({});
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const fetchChamados = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = process.env.REACT_APP_SUPABASE_URL;
      const serviceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY;
      if (!url || !serviceKey) throw new Error('Supabase URL ou Service Key não definidos');
      const response = await fetch(`${url}/rest/v1/chamado?status=eq.Aceito%20%2F%20Em%20andamento`, {
        method: 'GET',
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
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
      // Buscar endereços para cada chamado
      data.forEach(async (c: Chamado) => {
        if (c.localizacao && !enderecos[c.id]) {
          const [lat, lon] = c.localizacao.split(',').map(Number);
          const endereco = await getAddressFromCoords(lat, lon);
          setEnderecos(prev => ({ ...prev, [c.id]: endereco }));
        }
      });
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
      .channel('public:chamado')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chamado' }, (payload) => {
        fetchChamados();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line
  }, []);

  const handleVisualizar = (chamado: Chamado) => {
    setSelectedChamado(chamado);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedChamado(null);
  };

  const handleFazerAtendimento = async () => {
    if (!selectedChamado) return;
    try {
      const url = process.env.REACT_APP_SUPABASE_URL;
      const serviceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY;
      if (!url || !serviceKey) throw new Error('Supabase URL ou Service Key não definidos');
      const response = await fetch(`${url}/rest/v1/chamado?id=eq.${selectedChamado.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ status: 'A caminho' })
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error_description || data.message || `Erro ${response.status}`);
      }
      handleCloseModal();
      fetchChamados();
    } catch (err) {
      alert('Erro ao atualizar status para A caminho.');
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
                  {enderecos[c.id] || c.localizacao || 'Buscando endereço...'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                <span style={{ fontSize: 13 }}>{formatarDataHora(c.data_abertura)}</span>
                <span>
                  <Button size="small" color="primary" onClick={() => handleVisualizar(c)}>Visualizar</Button>
                  <Button size="small" color="error" onClick={() => {}} sx={{ ml: 1 }}>Recusar</Button>
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
        onFazerAtendimento={handleFazerAtendimento}
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