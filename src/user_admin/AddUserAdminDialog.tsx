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
import { sendInvite, criarAdminUser } from './api';

interface AddUserAdminDialogProps {
  open: boolean;
  onClose: () => void;
  initialData?: {
    nome: string;
    email: string;
    perfil?: string;
  };
  onSave?: (data: { nome: string; email: string; perfil: string }) => Promise<void>;
  atualizarLista?: () => void;
}

const AddUserAdminDialog: React.FC<AddUserAdminDialogProps> = ({ open, onClose, initialData, onSave, atualizarLista }) => {
  const [nome, setNome] = useState(initialData?.nome || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [perfil, setPerfil] = useState('administrador');

  React.useEffect(() => {
    setNome(initialData?.nome || '');
    setEmail(initialData?.email || '');
  }, [initialData, open]);

  const handleSave = async () => {
    if (!email || !nome || !perfil) {
      alert('Por favor, preencha todos os campos.');
      return;
    }
    if (onSave) {
      await onSave({ nome, email, perfil });
      if (atualizarLista) await atualizarLista();
      onClose();
      return;
    }
    try {
      console.log('[AddUserAdminDialog] Fluxo de adição (sendInvite + criarAdminUser)');
      const inviteResponse = await sendInvite(email);
      const userId = inviteResponse.user?.id || inviteResponse.id;
      if (!userId) {
        alert('Erro: user_id não retornado pelo convite.');
        return;
      }
      await criarAdminUser({ user_id: userId, nome, email, status: 'Ativo', perfil });
      if (atualizarLista) await atualizarLista();
      alert('Convite enviado e administrador criado com sucesso!');
      onClose();
    } catch (error: any) {
      console.error('Erro ao enviar convite:', error);
      alert('Erro ao enviar convite. Por favor, tente novamente.');
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