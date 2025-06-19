import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, CircularProgress, Typography, Box } from '@mui/material';
import { supabase } from '../../Supabase/supabaseRealtimeClient';
import ConfirmDeleteDialog from '../../components/ConfirmDeleteDialog';
import AddUserAdminDialog from './AddUserAdminDialog';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

interface UsuarioAdmin {
  id?: number;
  nome: string;
  email: string;
  perfil?: string;
  last_sign_in_at?: string | null;
}

const AdminUserList: React.FC = () => {
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UsuarioAdmin | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editUsuario, setEditUsuario] = useState<UsuarioAdmin | null>(null);
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  useEffect(() => {
    // Função para buscar usuários administrativos via API
    const fetchAdminUsersFromAPI = async () => {
      try {
        setLoading(true);
        setError(null);
        const url = process.env.REACT_APP_SUPABASE_URL;
        const serviceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY;
        if (!url || !serviceKey) throw new Error('REACT_APP_SUPABASE_URL ou REACT_APP_SUPABASE_SERVICE_KEY não definida no .env');
        const accessToken = localStorage.getItem('accessToken');
        const response = await fetch(`${url}/rest/v1/administrador?deletado=is.false`, {
          method: 'GET',
          headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });
        let data = await response.json();
        if (!response.ok) throw new Error(data.error_description || data.message || `Erro ${response.status}`);
        data.sort((a: UsuarioAdmin, b: UsuarioAdmin) => {
          if ((a as any).data_cadastro && (b as any).data_cadastro) {
            return new Date((b as any).data_cadastro).getTime() - new Date((a as any).data_cadastro).getTime();
          }
          return (b.id || 0) - (a.id || 0);
        });
        setUsuarios(data as UsuarioAdmin[]);
      } catch (error) {
        console.error('Erro ao carregar usuários administrativos:', error);
        setError('Não foi possível carregar a lista de usuários administrativos. Por favor, tente novamente mais tarde.');
      } finally {
        setLoading(false);
      }
    };
    fetchAdminUsersFromAPI();

    // Realtime subscription
    const channel = supabase
      .channel('public:administrador')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'administrador' }, (payload) => {
        fetchAdminUsersFromAPI();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleOpenDeleteDialog = (usuario: UsuarioAdmin) => {
    setUserToDelete(usuario);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setUserToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete || !userToDelete.id) return;
    try {
      const url = process.env.REACT_APP_SUPABASE_URL;
      const serviceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY;
      if (!url || !serviceKey) throw new Error('REACT_APP_SUPABASE_URL ou REACT_APP_SUPABASE_SERVICE_KEY não definida no .env');
      const accessToken = localStorage.getItem('accessToken');
      const response = await fetch(`${url}/rest/v1/administrador?id=eq.${userToDelete.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ deletado: true })
      });
      if (!response.ok) {
        const respData = await response.json().catch(() => ({}));
        throw new Error(respData.error_description || respData.message || `Erro ${response.status}`);
      }
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      alert('Usuário administrativo excluído com sucesso!');
    } catch (error) {
      alert('Erro ao excluir usuário administrativo.');
    }
  };

  const handleEdit = (usuario: UsuarioAdmin) => {
    setEditUsuario(usuario);
    setEditDialogOpen(true);
  };

  const handleEditDialogClose = () => {
    setEditDialogOpen(false);
    setEditUsuario(null);
  };

  const handleSaveEdit = async (data: { nome: string; email: string; perfil: string }) => {
    if (!editUsuario || !editUsuario.id) return;
    try {
      const url = process.env.REACT_APP_SUPABASE_URL;
      const serviceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY;
      if (!url || !serviceKey) throw new Error('REACT_APP_SUPABASE_URL ou REACT_APP_SUPABASE_SERVICE_KEY não definida no .env');
      const accessToken = localStorage.getItem('accessToken');
      const response = await fetch(`${url}/rest/v1/administrador?id=eq.${editUsuario.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          nome: data.nome,
          email: data.email,
          perfil: data.perfil
        })
      });
      if (!response.ok) {
        const respData = await response.json().catch(() => ({}));
        throw new Error(respData.error_description || respData.message || `Erro ${response.status}`);
      }
      setEditDialogOpen(false);
      setEditUsuario(null);
      alert('Usuário administrativo atualizado com sucesso!');
    } catch (error) {
      alert('Erro ao atualizar usuário administrativo.');
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
      <Table aria-label="tabela de usuários administrativos">
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>Nome</TableCell>
            {isDesktop && <TableCell>Email</TableCell>}
            {isDesktop && <TableCell>Perfil</TableCell>}
            {isDesktop && <TableCell>Último Login</TableCell>}
            <TableCell sx={{ minWidth: 100, whiteSpace: 'nowrap' }}>Ações</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {usuarios.length > 0 ? (
            usuarios.map((usuario) => (
              <TableRow key={usuario.id}>
                <TableCell>{usuario.id}</TableCell>
                <TableCell>{usuario.nome}</TableCell>
                {isDesktop && <TableCell>{usuario.email}</TableCell>}
                {isDesktop && <TableCell>{usuario.perfil || '-'}</TableCell>}
                {isDesktop && <TableCell>{usuario.last_sign_in_at ? new Date(usuario.last_sign_in_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '-'}</TableCell>}
                <TableCell sx={{ minWidth: 100, whiteSpace: 'nowrap' }}>
                  <Button size="small" color="primary" onClick={() => handleEdit(usuario)}>Editar</Button>
                  <Button size="small" color="error" onClick={() => handleOpenDeleteDialog(usuario)}>Excluir</Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={isDesktop ? 6 : 3} align="center" sx={{ minWidth: 100, whiteSpace: 'nowrap' }}>
                Nenhum usuário administrativo encontrado
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        onConfirm={handleConfirmDelete}
        itemName={userToDelete?.nome}
      />
      <AddUserAdminDialog
        open={editDialogOpen}
        onClose={handleEditDialogClose}
        initialData={editUsuario ? {
          nome: editUsuario.nome || '',
          email: editUsuario.email || '',
          perfil: editUsuario.perfil || 'administrador',
        } : undefined}
        onSave={handleSaveEdit}
      />
    </TableContainer>
  );
};

export default AdminUserList; 
