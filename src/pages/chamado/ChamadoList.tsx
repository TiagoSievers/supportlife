import React, { useEffect, useState, useRef } from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, CircularProgress, Button, Tabs, Tab } from '@mui/material';
import PhoneInTalkIcon from '@mui/icons-material/PhoneInTalk';
import { supabase } from '../../Supabase/supabaseRealtimeClient';
import CallModal from './CallModal';

// Interface para o status
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// Componente TabPanel
function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`chamado-tabpanel-${index}`}
      aria-labelledby={`chamado-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

interface ChamadoListProps {
  onNewChamado?: () => void;
}

const ChamadoList: React.FC<ChamadoListProps> = ({ onNewChamado }) => {
  const [chamados, setChamados] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupChamadoId, setPopupChamadoId] = useState<number | null>(null);
  const [finalizingId, setFinalizingId] = useState<number | null>(null);
  const [enderecos, setEnderecos] = useState<{ [id: number]: string | null }>({});
  const [popupChamado, setPopupChamado] = useState<any | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastMaxIdRef = useRef<number>(0);

  // Função para filtrar chamados por status
  const getFilteredChamados = () => {
    switch (tabValue) {
      case 0: // Pendentes
        return chamados.filter(c => c.status === 'Pendente');
      case 1: // Em análise
        return chamados.filter(c => c.status === 'Em análise');
      case 2: // Em andamento
        return chamados.filter(c => c.status === 'Aceito / Em andamento' || c.status === 'A caminho');
      case 3: // Finalizados
        return chamados.filter(c => c.status === 'finalizado');
      case 4: // Todos
        return chamados;
      default:
        return chamados.filter(c => c.status === 'Pendente');
    }
  };

  const fetchChamados = async () => {
    setLoading(true);
    setError(null);
    try {
      setLoading(true);
      setError(null);
      const url = process.env.REACT_APP_SUPABASE_URL;
      const serviceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY;
      if (!url || !serviceKey) throw new Error('REACT_APP_SUPABASE_URL ou REACT_APP_SUPABASE_SERVICE_KEY não definida no .env');
      const accessToken = localStorage.getItem('accessToken');
      const response = await fetch(`${url}/rest/v1/chamado`, {
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
      // Detecta novo chamado
      const maxId = data.length > 0 ? Math.max(...data.map((c: any) => c.id || 0)) : 0;
      if (lastMaxIdRef.current && maxId > lastMaxIdRef.current) {
        // Novo chamado detectado
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play();
        }
        if (onNewChamado) onNewChamado();
      }
      lastMaxIdRef.current = maxId;
      setChamados(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao buscar chamados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    audioRef.current = new Audio('/assets/notification.mp3');
    // Inicializa o lastMaxIdRef com 0 (ou o maior id já existente, se quiser evitar tocar na primeira carga)
    lastMaxIdRef.current = 0;

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
    // Buscar o chamado completo
    const chamado = chamados.find((c) => c.id === chamadoId);
    let nome = '';
    if (chamado && chamado.cliente_id) {
      // Buscar nome do cliente
      try {
        const url = process.env.REACT_APP_SUPABASE_URL;
        const serviceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY;
        if (!url || !serviceKey) throw new Error('Supabase URL ou Service Key não definidos');
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
      } catch (err) {
        // Se der erro, ignora e segue sem nome
      }
    }
    setPopupChamado({
      id: chamadoId,
      nome,
      endereco: chamado && chamado.endereco_textual ? chamado.endereco_textual : '',
    });
    setPopupChamadoId(chamadoId);
    setPopupOpen(true);
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

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>Lista de chamados</Typography>
      
      {/* Tabs de Status - Reordenadas com Pendentes primeiro */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="status tabs">
          <Tab label="Pendentes" />
          <Tab label="Em análise" />
          <Tab label="Em andamento" />
          <Tab label="Finalizados" />
          <Tab label="Todos" />
        </Tabs>
      </Box>

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
              {getFilteredChamados().map((chamado) => (
                <TableRow key={chamado.id}>
                  <TableCell>{chamado.id}</TableCell>
                  <TableCell>{chamado.cliente_id}</TableCell>
                  <TableCell>{chamado.status}</TableCell>
                  <TableCell>{chamado.endereco_textual || 'Endereço não disponível'}</TableCell>
                  <TableCell>{formatarDataHora(chamado.data_abertura)}</TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      color="primary"
                      variant="contained"
                      sx={{ mr: 1 }}
                      onClick={() => handleFazerChamado(chamado.id)}
                      disabled={chamado.status === 'finalizado'}
                    >
                      Visualizar chamado
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Modal de Chamada */}
      <CallModal 
        open={popupOpen} 
        chamadoId={popupChamadoId} 
        onClose={handleClosePopup} 
        nome={popupChamado?.nome} 
        endereco={popupChamado?.endereco} 
        status={chamados.find(c => c.id === popupChamadoId)?.status}
      />
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