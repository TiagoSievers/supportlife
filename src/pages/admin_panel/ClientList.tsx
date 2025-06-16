// =============================
// ÍNDICE DO ARQUIVO
// 15: ClientList (componente principal)
// 24: useEffect - Carregamento de clientes
// 44: handleEdit
// 49: handleDialogClose
// 54: handleSaveEdit
// 73: handleOpenDeleteDialog
// 78: handleCloseDeleteDialog
// 83: handleConfirmDelete
// =============================

import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, CircularProgress, Typography, Box } from '@mui/material';
import { supabase } from '../../Supabase/supabaseRealtimeClient';
import ConfirmDeleteDialog from '../../components/ConfirmDeleteDialog';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

interface Cliente {
  id: number;
  nome: string;
  email: string;
  telefone: string;
  status: string;
  perfil: string;
  criado_em?: string;
  deletado?: boolean;
}

interface ClientListProps {
  onEditClient: (cliente: Cliente) => void;
}

const ClientList: React.FC<ClientListProps> = ({ onEditClient }) => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Cliente | null>(null);
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  // Função para buscar clientes via API (conforme exemplo curl)
  const fetchClientesFromAPI = async () => {
    try {
      setLoading(true);
      setError(null);
      const url = process.env.REACT_APP_SUPABASE_URL;
      const serviceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY;
      if (!url || !serviceKey) throw new Error('REACT_APP_SUPABASE_URL ou REACT_APP_SUPABASE_SERVICE_KEY não definida no .env');
      const accessToken = localStorage.getItem('userToken');
      const response = await fetch(`${url}/rest/v1/cliente`, {
        method: 'GET',
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error_description || data.message || `Erro ${response.status}`);
      }
      const data = await response.json();
      // Filtrar clientes não deletados
      const clientesNaoDeletados = data.filter((c: Cliente) => !c.deletado);
      // Ordena do mais recente para o mais antigo
      clientesNaoDeletados.sort((a: Cliente, b: Cliente) => {
        if (a.criado_em && b.criado_em) {
          return new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime();
        }
        return b.id - a.id;
      });
      setClientes(clientesNaoDeletados);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      setError('Não foi possível carregar a lista de clientes. Por favor, tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientesFromAPI();
    const channel = supabase
      .channel('public:cliente')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cliente' }, (payload) => {
        fetchClientesFromAPI();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleOpenDeleteDialog = (cliente: Cliente) => {
    setClientToDelete(cliente);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setClientToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!clientToDelete) return;
    try {
      // PATCH para marcar como deletado
      const url = process.env.REACT_APP_SUPABASE_URL;
      const serviceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY;
      const accessToken = localStorage.getItem('userToken');
      if (!url || !serviceKey) throw new Error('REACT_APP_SUPABASE_URL ou REACT_APP_SUPABASE_SERVICE_KEY não definida no .env');
      const response = await fetch(`${url}/rest/v1/cliente?id=eq.${clientToDelete.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({ deletado: true })
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error_description || data.message || `Erro ${response.status}`);
      }
      setDeleteDialogOpen(false);
      setClientToDelete(null);
      alert('Cliente excluído com sucesso!');
      // Recarregar lista
      fetchClientesFromAPI();
    } catch (error) {
      alert('Erro ao excluir cliente.');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <TableContainer component={Paper} sx={{ overflowX: 'auto', maxWidth: '100vw' }}>
      <Table aria-label="tabela de clientes">
        <TableHead>
          <TableRow>
            <TableCell sx={!isDesktop ? { width: '33.33%' } : {}}>ID</TableCell>
            <TableCell sx={!isDesktop ? { width: '33.33%' } : {}}>Nome</TableCell>
            {isDesktop && <TableCell>Email</TableCell>}
            {isDesktop && <TableCell>Telefone</TableCell>}
            {isDesktop && <TableCell>Status</TableCell>}
            <TableCell sx={!isDesktop ? { width: '33.33%', minWidth: 100, whiteSpace: 'nowrap' } : { minWidth: 100, whiteSpace: 'nowrap' }}>Ações</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {clientes.length > 0 ? (
            clientes.map((cliente) => (
              <TableRow key={cliente.id}>
                <TableCell sx={!isDesktop ? { width: '33.33%' } : {}}>{cliente.id}</TableCell>
                <TableCell sx={!isDesktop ? { width: '33.33%' } : {}}>{cliente.nome}</TableCell>
                {isDesktop && <TableCell>{cliente.email}</TableCell>}
                {isDesktop && <TableCell>{cliente.telefone}</TableCell>}
                {isDesktop && <TableCell>{cliente.status}</TableCell>}
                <TableCell sx={!isDesktop ? { width: '33.33%', minWidth: 100, whiteSpace: 'nowrap' } : { minWidth: 100, whiteSpace: 'nowrap' }}>
                  <Button size="small" color="primary" onClick={() => onEditClient(cliente)}>Editar</Button>
                  <Button size="small" color="error" onClick={() => handleOpenDeleteDialog(cliente)}>Excluir</Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={isDesktop ? 6 : 3} align="center" sx={!isDesktop ? { width: '33.33%' } : { minWidth: 100, whiteSpace: 'nowrap' }}>
                Nenhum cliente encontrado
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        onConfirm={handleConfirmDelete}
        itemName={clientToDelete?.nome}
      />
    </TableContainer>
  );
};

export default ClientList; 
