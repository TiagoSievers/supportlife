import React, { useEffect, useState } from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, CircularProgress, Button, Tabs, Tab, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import PhoneInTalkIcon from '@mui/icons-material/PhoneInTalk';
import { supabase } from '../../Supabase/supabaseRealtimeClient';
import CallModal from './CallModal';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

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
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

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
      case 4: // Concluídos
        return chamados.filter(c => c.status === 'concluído');
      case 5: // Todos
        return chamados;
      default:
        return chamados.filter(c => c.status === 'Pendente');
    }
  };

  const fetchChamados = async () => {
    setLoading(true);
    setError(null);
    try {
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

      setChamados(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao buscar chamados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChamados();
    
    // Configurar canal Realtime do Supabase
    const channel = supabase
      .channel('public:chamado')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'chamado' 
        }, 
        (payload) => {
          // Quando um novo chamado é inserido
          setChamados(chamados => {
            const newChamado = payload.new;
            // Evitar duplicatas
            if (chamados.some(c => c.id === newChamado.id)) {
              return chamados;
            }
            // Adicionar novo chamado no início da lista
            return [newChamado, ...chamados].sort((a, b) => {
              if (a.data_abertura && b.data_abertura) {
                return new Date(b.data_abertura).getTime() - new Date(a.data_abertura).getTime();
              }
              return (b.id || 0) - (a.id || 0);
            });
          });
          // Notificar sobre novo chamado
          if (onNewChamado) onNewChamado();
        }
      )
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chamado'
        },
        (payload) => {
          // Quando um chamado é atualizado
          setChamados(chamados => {
            return chamados.map(chamado => 
              chamado.id === payload.new.id ? payload.new : chamado
            );
          });
        }
      )
      .on('postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'chamado'
        },
        (payload) => {
          // Quando um chamado é deletado
          setChamados(chamados => 
            chamados.filter(chamado => chamado.id !== payload.old.id)
          );
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.info('Conectado ao Realtime dos chamados');
        }
      });

    // Cleanup na desmontagem do componente
    return () => {
      channel.unsubscribe();
    };
  }, []); // Dependência vazia pois queremos executar apenas uma vez na montagem

  const handleFazerChamado = async (chamadoId: number) => {
    // Buscar o chamado completo
    const chamado = chamados.find((c) => c.id === chamadoId);
    let nome = '';
    let telefone = '';
    if (chamado && chamado.cliente_id) {
      try {
        const url = process.env.REACT_APP_SUPABASE_URL;
        const serviceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY;
        const accessToken = localStorage.getItem('accessToken');
        if (!url || !serviceKey) throw new Error('Supabase URL ou Service Key não definidos');
        
        const clienteResp = await fetch(`${url}/rest/v1/cliente?id=eq.${chamado.cliente_id}`, {
          headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          }
        });
        const clienteData = await clienteResp.json();
        if (clienteData && clienteData[0]) {
          console.log('[CLIENTE COMPLETO]', clienteData[0]);
          telefone = clienteData[0].telefone || '';
          nome = clienteData[0].nome || '';
        }
      } catch (err) {
        console.error('Erro ao buscar dados do cliente:', err);
      }
    }

    if (chamado) {
      console.log('[VISUALIZAR CHAMADO] Cliente:', {
        chamado_id: chamado.id,
        cliente_id: chamado.cliente_id,
        nome: nome,
        telefone: telefone,
        status: chamado.status,
        endereco: chamado.endereco_textual || '',
      });
    }

    setPopupChamado({
      id: chamadoId,
      nome,
      telefone,
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
      const accessToken = localStorage.getItem('accessToken');
      const response = await fetch(`${url}/rest/v1/chamado?id=eq.${chamadoId}`, {
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
      {isDesktop ? (
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="status tabs">
            <Tab label="Pendentes" />
            <Tab label="Em análise" />
            <Tab label="Em andamento" />
            <Tab label="Finalizados" />
            <Tab label="Concluídos" />
            <Tab label="Todos" />
          </Tabs>
        </Box>
      ) : (
        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel id="status-select-label">Status</InputLabel>
          <Select
            labelId="status-select-label"
            id="status-select"
            value={tabValue}
            label="Status"
            onChange={e => setTabValue(Number(e.target.value))}
          >
            <MenuItem value={0}>Pendentes</MenuItem>
            <MenuItem value={1}>Em análise</MenuItem>
            <MenuItem value={2}>Em andamento</MenuItem>
            <MenuItem value={3}>Finalizados</MenuItem>
            <MenuItem value={4}>Concluídos</MenuItem>
            <MenuItem value={5}>Todos</MenuItem>
          </Select>
        </FormControl>
      )}

      {loading ? (
        <CircularProgress />
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : (
        <TableContainer component={Paper} sx={{ mt: 2, overflowX: 'auto', maxWidth: '100vw' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Cliente ID</TableCell>
                <TableCell>Status</TableCell>
                {isDesktop ? (
                  <TableCell>Localização</TableCell>
                ) : (
                  <TableCell>Ação</TableCell>
                )}
                {isDesktop && <TableCell>Data Abertura</TableCell>}
                {isDesktop && <TableCell>Ações</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {getFilteredChamados().map((chamado) => (
                <TableRow key={chamado.id}>
                  <TableCell>{chamado.id}</TableCell>
                  <TableCell>{chamado.cliente_id}</TableCell>
                  <TableCell>{chamado.status}</TableCell>
                  {isDesktop ? (
                    <TableCell>{chamado.endereco_textual || 'Endereço não disponível'}</TableCell>
                  ) : (
                    <TableCell>
                      <Button
                        size="small"
                        color="primary"
                        variant="text"
                        sx={{ textTransform: 'none', fontWeight: 500, fontSize: '1em', p: 0, minWidth: 0 }}
                        onClick={() => handleFazerChamado(chamado.id)}
                        disabled={chamado.status === 'finalizado' || chamado.status === 'concluído'}
                      >
                        Visualizar
                      </Button>
                    </TableCell>
                  )}
                  {isDesktop && <TableCell>{formatarDataHora(chamado.data_abertura)}</TableCell>}
                  {isDesktop && (
                    <TableCell>
                      <Button
                        size="small"
                        color="primary"
                        variant="text"
                        sx={{ textTransform: 'none', fontWeight: 500, fontSize: '1em', p: 0, minWidth: 0 }}
                        onClick={() => handleFazerChamado(chamado.id)}
                        disabled={chamado.status === 'finalizado' || chamado.status === 'concluído'}
                      >
                        Visualizar
                      </Button>
                    </TableCell>
                  )}
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
        telefone={popupChamado?.telefone}
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