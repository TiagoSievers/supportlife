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
import { buscarClientes, updateCliente, deleteCliente } from './api';
import AddClientDialog from '../cliente/AddClientDialog';
import ConfirmDeleteDialog from '../components/ConfirmDeleteDialog';
import { supabase } from '../Supabase/supabaseRealtimeClient';

interface Cliente {
  id: number;
  nome: string;
  email: string;
  telefone: string;
  status: string;
  perfil: string;
  criado_em?: string;
}

const ClientList: React.FC = () => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editClient, setEditClient] = useState<Cliente | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Cliente | null>(null);

  // Função para buscar clientes
  const loadClientes = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await buscarClientes();
      // Ordena do mais recente para o mais antigo
      data.sort((a: Cliente, b: Cliente) => {
        if (a.criado_em && b.criado_em) {
          return new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime();
        }
        // Fallback: ordena por id decrescente
        return b.id - a.id;
      });
      setClientes(data);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      setError('Não foi possível carregar a lista de clientes. Por favor, tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClientes();
    // Realtime subscription
    const channel = supabase
      .channel('public:cliente')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cliente' },
        (payload) => {
          loadClientes();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleEdit = (cliente: Cliente) => {
    setEditClient(cliente);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditClient(null);
  };

  const handleSaveEdit = async (data: { nome: string; email: string; telefone: string }) => {
    if (!editClient) return;
    try {
      await updateCliente(editClient.id, {
        nome: data.nome,
        email: data.email,
        telefone: data.telefone,
        status: editClient.status
      });
      // Atualiza a lista após edição
      const updated = await buscarClientes();
      updated.sort((a: Cliente, b: Cliente) => {
        if (a.criado_em && b.criado_em) {
          return new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime();
        }
        return b.id - a.id;
      });
      setClientes(updated);
      setDialogOpen(false);
      setEditClient(null);
      alert('Cliente atualizado com sucesso!');
    } catch (error) {
      alert('Erro ao atualizar cliente.');
    }
  };

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
      await deleteCliente(clientToDelete.id);
      // Atualiza a lista após exclusão
      const updated = await buscarClientes();
      updated.sort((a: Cliente, b: Cliente) => {
        if (a.criado_em && b.criado_em) {
          return new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime();
        }
        return b.id - a.id;
      });
      setClientes(updated);
      setDeleteDialogOpen(false);
      setClientToDelete(null);
      alert('Cliente excluído com sucesso!');
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
    <TableContainer component={Paper}>
      <Table sx={{ minWidth: 650 }} aria-label="tabela de clientes">
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>Nome</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Telefone</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Ações</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {clientes.length > 0 ? (
            clientes.map((cliente) => (
              <TableRow key={cliente.id}>
                <TableCell>{cliente.id}</TableCell>
                <TableCell>{cliente.nome}</TableCell>
                <TableCell>{cliente.email}</TableCell>
                <TableCell>{cliente.telefone}</TableCell>
                <TableCell>{cliente.status}</TableCell>
                <TableCell>
                  <Button size="small" color="primary" onClick={() => handleEdit(cliente)}>Editar</Button>
                  <Button size="small" color="error" onClick={() => handleOpenDeleteDialog(cliente)}>Excluir</Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} align="center">
                Nenhum cliente encontrado
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {/* Diálogo de edição */}
      <AddClientDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        initialData={editClient ? {
          nome: editClient.nome,
          email: editClient.email,
          telefone: editClient.telefone,
        } : undefined}
        onSave={editClient ? handleSaveEdit : undefined}
      />
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