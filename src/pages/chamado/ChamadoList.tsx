import React, { useEffect, useState } from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, CircularProgress, Button } from '@mui/material';
import PhoneInTalkIcon from '@mui/icons-material/PhoneInTalk';
import { supabase } from '../../Supabase/supabaseRealtimeClient';
import CallModal from './CallModal';
import { getAddressFromCoords } from './getAddressFromCoords';

const ChamadoList: React.FC = () => {
  const [chamados, setChamados] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupChamadoId, setPopupChamadoId] = useState<number | null>(null);
  const [finalizingId, setFinalizingId] = useState<number | null>(null);
  const [enderecos, setEnderecos] = useState<{ [id: number]: string | null }>({});
  const [popupChamado, setPopupChamado] = useState<any | null>(null);

  const fetchChamados = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = process.env.REACT_APP_SUPABASE_URL;
      const serviceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY;
      if (!url || !serviceKey) throw new Error('Supabase URL ou Service Key não definidos');
      const response = await fetch(`${url}/rest/v1/chamado`, {
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
      data.forEach(async (c: any) => {
        if (c.localizacao && !enderecos[c.id]) {
          const [lat, lon] = c.localizacao.split(',').map(Number);
          let endereco = await getAddressFromCoords(lat, lon);
          if (endereco) {
            // Remove o CEP se houver
            endereco = endereco.split(',').filter((part: string) => !/\d{5}-?\d{3}/.test(part)).join(',');
          }
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
  }, []);

  const handleFazerChamado = async (chamadoId: number) => {
    try {
      const url = process.env.REACT_APP_SUPABASE_URL;
      const serviceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY;
      if (!url || !serviceKey) throw new Error('Supabase URL ou Service Key não definidos');
      const administradorId = localStorage.getItem('administradorId');
      const patchBody: Record<string, any> = { status: 'Em análise' };
      if (administradorId) patchBody['operador_id'] = Number(administradorId);
      console.log('[ChamadoList] Fazer o chamado:', { chamadoId, administradorId, patchBody });
      const response = await fetch(`${url}/rest/v1/chamado?id=eq.${chamadoId}`, {
        method: 'PATCH',
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(patchBody)
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error_description || data.message || `Erro ${response.status}`);
      }
      // Buscar o chamado completo
      const chamado = chamados.find((c) => c.id === chamadoId);
      let nome = '';
      if (chamado && chamado.cliente_id) {
        // Buscar nome do cliente
        const clienteResp = await fetch(`${url}/rest/v1/cliente?id=eq.${chamado.cliente_id}`, {
          headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
          }
        });
        const clienteData = await clienteResp.json();
        if (clienteData && clienteData[0] && clienteData[0].nome) {
          nome = clienteData[0].nome;
        }
      }
      setPopupChamado({
        id: chamadoId,
        nome,
        endereco: enderecos[chamadoId] || (chamado && chamado.localizacao) || '',
      });
      setPopupChamadoId(chamadoId);
      setPopupOpen(true);
    } catch (err) {
      alert('Erro ao atualizar status para Em análise.');
      return;
    }
  };

  const handleClosePopup = () => {
    setPopupOpen(false);
    setPopupChamadoId(null);
    setPopupChamado(null);
  };

  const handleFinalizar = async (chamadoId: number) => {
    setFinalizingId(chamadoId);
    try {
      const url = process.env.REACT_APP_SUPABASE_URL;
      const serviceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY;
      if (!url || !serviceKey) throw new Error('Supabase URL ou Service Key não definidos');
      const response = await fetch(`${url}/rest/v1/chamado?id=eq.${chamadoId}`, {
        method: 'PATCH',
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ status: 'finalizado' })
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error_description || data.message || `Erro ${response.status}`);
      }
    } catch (err) {
      alert('Erro ao finalizar chamado.');
    } finally {
      setFinalizingId(null);
    }
  };

  return (
    <Box>
      <Typography variant="h6">Lista de chamados</Typography>
      {loading ? (
        <CircularProgress />
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : (
        <TableContainer component={Paper} sx={{ mt: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Cliente ID</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Localização</TableCell>
                <TableCell>Data Abertura</TableCell>
                <TableCell>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {chamados.map((chamado) => (
                <TableRow key={chamado.id}>
                  <TableCell>{chamado.id}</TableCell>
                  <TableCell>{chamado.cliente_id}</TableCell>
                  <TableCell>{chamado.status}</TableCell>
                  <TableCell>{enderecos[chamado.id] || chamado.localizacao || 'Buscando endereço...'}</TableCell>
                  <TableCell>{formatarDataHora(chamado.data_abertura)}</TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      color="primary"
                      variant="contained"
                      sx={{ mr: 1 }}
                      onClick={() => {
                        console.log('[ChamadoList] Cliquei no botão Fazer o chamado!', chamado.id);
                        handleFazerChamado(chamado.id);
                      }}
                    >
                      Fazer o chamado
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      variant="contained"
                      disabled={finalizingId === chamado.id}
                      onClick={() => handleFinalizar(chamado.id)}
                    >
                      Finalizar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      {/* Popup de Ligação */}
      <CallModal open={popupOpen} chamadoId={popupChamadoId} onClose={handleClosePopup} nome={popupChamado?.nome} endereco={popupChamado?.endereco} />
    </Box>
  );
};

export default ChamadoList;

// Função para formatar data/hora
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