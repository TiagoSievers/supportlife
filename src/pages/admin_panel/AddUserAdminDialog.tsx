// =============================
// ÍNDICE DO ARQUIVO
// 1: Importações
// 13: Tipos e Props
// 23: Componente AddUserAdminDialog
// 27: useState e useEffect
// 34: handleSave
// 67: JSX do Dialog
// =============================
import React, { useState } from 'react';
import { 
  Dialog, 
  DialogActions, 
  DialogContent, 
  DialogContentText, 
  DialogTitle, 
  TextField, 
  Button, 
  Select, 
  MenuItem, 
  InputLabel, 
  FormControl 
} from '@mui/material';
import InputMask from 'react-input-mask';

interface AddUserAdminDialogProps {
  open: boolean;
  onClose: () => void;
  initialData?: {
    nome: string;
    email: string;
    perfil?: string;
    telefone?: string;
  };
  onSave?: (data: { nome: string; email: string; perfil: string; telefone: string }) => Promise<void>;
  atualizarLista?: () => void;
}

const AddUserAdminDialog: React.FC<AddUserAdminDialogProps> = ({ open, onClose, initialData, onSave, atualizarLista }) => {
  const [nome, setNome] = useState(initialData?.nome || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [perfil, setPerfil] = useState('administrador');
  const [telefone, setTelefone] = useState(initialData?.telefone || '');

  React.useEffect(() => {
    setNome(initialData?.nome || '');
    setEmail(initialData?.email || '');
    setTelefone(initialData?.telefone || '');
  }, [initialData, open]);

  const handleSave = async () => {
    if (!email || !nome || !perfil || !telefone) {
      alert('Por favor, preencha todos os campos.');
      return;
    }
    if (onSave) {
      // Modo edição: NÃO envia convite, apenas atualiza
      await onSave({ nome, email, perfil, telefone });
      if (atualizarLista) await atualizarLista();
      onClose();
      return;
    }
    // Modo criação: envia convite e cria admin
    try {
      const url = process.env.REACT_APP_SUPABASE_URL;
      const serviceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY;
      const serviceRoleKey = process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY;
      if (!url || !serviceKey || !serviceRoleKey) throw new Error('Variáveis de ambiente do Supabase não definidas');
      // 1. Enviar convite
      const inviteResponse = await fetch(`${url}/auth/v1/invite`, {
        method: 'POST',
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });
      const inviteData = await inviteResponse.json();
      if (!inviteResponse.ok) {
        throw new Error(inviteData.error_description || inviteData.message || `Erro ${inviteResponse.status}`);
      }
      const userId = inviteData.user?.id || inviteData.id;
      if (!userId) {
        alert('Erro: user_id não retornado pelo convite.');
        return;
      }
      // 2. Criar admin
      const body = { user_id: userId, nome, email, status: 'Ativo', perfil, telefone };
      const adminResponse = await fetch(`${url}/rest/v1/administrador`, {
        method: 'POST',
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(body)
      });
      if (!adminResponse.ok) {
        const adminData = await adminResponse.json().catch(() => ({}));
        throw new Error(adminData.error_description || adminData.message || `Erro ${adminResponse.status}`);
      }
      if (atualizarLista) await atualizarLista();
      alert('Convite enviado e administrador criado com sucesso!');
      onClose();
    } catch (error: any) {
      console.error('Erro ao enviar convite/criar admin:', error);
      alert('Erro ao enviar convite/criar admin. Por favor, tente novamente.');
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Adicionar Novo Usuário Administrativo</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Preencha as informações abaixo para adicionar um novo usuário administrativo.
        </DialogContentText>
        <TextField
          autoFocus
          margin="dense"
          id="nome"
          label="Nome Completo"
          type="text"
          fullWidth
          variant="outlined"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
        />
        <TextField
          margin="dense"
          id="email"
          label="Email"
          type="email"
          fullWidth
          variant="outlined"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <TextField
          margin="dense"
          id="telefone"
          label="Telefone"
          type="text"
          fullWidth
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
          required
          InputProps={{
            inputComponent: InputMask as any,
            inputProps: {
              mask: '(99) 99999-9999',
              maskChar: null
            }
          }}
        />
        <FormControl fullWidth margin="dense">
          <InputLabel id="perfil-label">Perfil</InputLabel>
          <Select
            labelId="perfil-label"
            id="perfil"
            value={perfil}
            label="Perfil"
            onChange={(e) => setPerfil(e.target.value)}
            required
          >
            <MenuItem value="administrador">Administrador</MenuItem>
            <MenuItem value="operador">Operador</MenuItem>
            <MenuItem value="supervisor">Supervisor</MenuItem>
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave} variant="contained">Salvar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddUserAdminDialog; 