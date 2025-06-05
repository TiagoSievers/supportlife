import React, { useEffect, useState } from 'react';
import { Paper, Typography, Box, CircularProgress, Button } from '@mui/material';
import ChamadoModalClient from './ChamadoModalClient';

export interface Chamado {
  id: string;
  cliente_id: string;
  status: string;
  data_abertura: string;
  localizacao: string;
  posicao_inicial_socorrista?: string;
}

const ChamadoClienteList: React.FC = () => {
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedChamado, setSelectedChamado] = useState<Chamado | null>(null);

  useEffect(() => {
    const fetchChamados = async () => {
      setLoading(true);
      setError(null);
      try {
        const url = process.env.REACT_APP_SUPABASE_URL;
        const serviceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY;
        const clienteId = localStorage.getItem('clienteId');
        if (!url || !serviceKey || !clienteId) throw new Error('Supabase URL, Service Key ou Cliente não definidos');
        const response = await fetch(`${url}/rest/v1/chamado?cliente_id=eq.${clienteId}&order=data_abertura.desc`, {
          method: 'GET',
          headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`,
            'Content-Type': 'application/json'
          }
        });
        let data = await response.json();
        if (!response.ok) throw new Error(data.error_description || data.message || `Erro ${response.status}`);
        setChamados(data);
      } catch (err: any) {
        setError(err.message || 'Erro ao buscar chamados');
      } finally {
        setLoading(false);
      }
    };
    fetchChamados();
  }, []);

  const handleVisualizar = (chamado: Chamado) => {
    setSelectedChamado(chamado);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedChamado(null);
  };

  return (
    <Box sx={{ background: 'transparent', boxShadow: 'none', border: 'none' }}>
      <Typography variant="h6" sx={{ p: 2 }}>
        Meus Chamados
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
                  {c.localizacao || 'Sem localização'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                <span style={{ fontSize: 13 }}>{formatarDataHora(c.data_abertura)}</span>
                <span>
                  <Button size="small" color="primary" onClick={() => handleVisualizar(c)}>Visualizar</Button>
                </span>
              </Box>
            </Paper>
          ))}
        </Box>
      )}
      <ChamadoModalClient
        open={modalOpen}
        chamado={selectedChamado}
        onClose={handleCloseModal}
      />
    </Box>
  );
};

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

export default ChamadoClienteList; 