import React, { useEffect, useState, useRef } from 'react';
import { Paper, Typography, Table, TableHead, TableRow, TableCell, TableBody, Box, CircularProgress, Button, useTheme, useMediaQuery } from '@mui/material';
import ChamadoModal from '../emer_socorrista/ChamadoModal';
import { supabase } from '../../Supabase/supabaseRealtimeClient';
import { useNavigate } from 'react-router-dom';

export interface Chamado {
  id: string;
  cliente_id: string;
  status: string;
  data_abertura: string;
  localizacao: string;
  endereco_textual?: string;
  posicao_inicial_socorrista?: string;
  operador_id?: string;
  data_fechamento?: string;
  descricao?: string;
  prioridade?: string;
  notificacao_familiares?: any[];
}

// Função para ativar o sino no Navbar
const ativarSinoNotificacao = () => {
  const event = new CustomEvent('novaNotificacao');
  window.dispatchEvent(event);
};

// Função para obter headers de autenticação
const getAuthHeaders = () => {
  const serviceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY;
  const accessToken = localStorage.getItem('accessToken');
  
  if (!serviceKey) throw new Error('Supabase Service Key não definido');
  if (!accessToken) throw new Error('accessToken não encontrado');
  
  return {
    'apikey': serviceKey,
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  };
};

// Função para validar ambiente
const validateEnvironment = () => {
  const url = process.env.REACT_APP_SUPABASE_URL;
  const familiarId = localStorage.getItem('familiarId');
  
  if (!url) throw new Error('Supabase URL não definida');
  if (!familiarId) throw new Error('familiarId não encontrado');
  
  return { url, familiarId };
};

const NotificaoList: React.FC = () => {
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedChamado, setSelectedChamado] = useState<Chamado | null>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();

  const handleVisualizar = async (chamado: Chamado) => {
    localStorage.setItem('chamadoFamilia', JSON.stringify(chamado));
    navigate('/family-emergency-location');
  };

  // Função para buscar a lista de chamados do familiar
  const fetchChamados = async () => {
    try {
      const { url, familiarId } = validateEnvironment();
      const headers = getAuthHeaders();
      const fetchUrl = `${url}/rest/v1/chamado?notificacao_familiares=cs.[{"id":"${familiarId}"}]&status=not.in.(concluído,Pendente,finalizado)`;
      const response = await fetch(fetchUrl, { method: 'GET', headers });
      let data = await response.json();
      data = data.sort((a: any, b: any) => {
        if (a.data_abertura && b.data_abertura) {
          return new Date(b.data_abertura).getTime() - new Date(a.data_abertura).getTime();
        }
        return (b.id || 0) - (a.id || 0);
      });
      // Comparar os IDs dos chamados antes de atualizar o estado
      const prevIds = chamados.map((c) => c.id).join(',');
      const newIds = data.map((c: any) => c.id).join(',');
      if (prevIds !== newIds) {
        console.log('Lista de chamados modificada');
      }
      setChamados(data);
    } catch (err) {
      setChamados([]);
      setError('Erro ao buscar chamados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChamados();
  }, []);

  useEffect(() => {
    const subscription = supabase
      .channel('chamados-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chamado'
        },
        (payload) => {
          fetchChamados();
        }
      )
      .subscribe();
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedChamado(null);
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
                  {c.endereco_textual || 'Endereço não informado'}
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
                </span>
              </Box>
            </Paper>
          ))}
        </Box>
      )}
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

export default NotificaoList; 