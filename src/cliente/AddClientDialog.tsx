import React, { useState } from 'react';
import { 
  Dialog, 
  DialogActions, 
  DialogContent, 
  DialogContentText, 
  DialogTitle, 
  TextField, 
  Button 
} from '@mui/material';
import { sendInvite, criarCliente } from './api';

// =============================
// Índice de Fluxos em AddClientDialog
// 1. Criação de Cliente (sendInvite + criarCliente)
// 2. Edição de Cliente (onSave)
// =============================

interface AddClientDialogProps {
  open: boolean;
  onClose: () => void;
  initialData?: {
    nome: string;
    email: string;
    telefone: string;
  };
  onSave?: (data: { nome: string; email: string; telefone: string }) => Promise<void>;
}

const AddClientDialog: React.FC<AddClientDialogProps> = ({ open, onClose, initialData, onSave }) => {
  const [nome, setNome] = useState(initialData?.nome || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [telefone, setTelefone] = useState(initialData?.telefone || '');

  React.useEffect(() => {
    setNome(initialData?.nome || '');
    setEmail(initialData?.email || '');
    setTelefone(initialData?.telefone || '');
  }, [initialData, open]);

  const handleSave = async () => {
    if (!email || !nome || !telefone) {
      alert('Por favor, preencha todos os campos.');
      return;
    }

    // === FLUXO 1: CRIAÇÃO DE CLIENTE ===
    if (!onSave) {
      try {
        console.log('[AddClientDialog] Fluxo de adição (sendInvite + criarCliente)');
        const inviteResponse = await sendInvite(email);
        console.log('[AddClientDialog] Resposta do convite:', inviteResponse);

        const userId = inviteResponse.id;
        if (!userId) {
          alert('Erro: user_id não retornado pelo convite.');
          return;
        }

        await criarCliente({ user_id: userId, nome, telefone, email });
        alert('Cliente criado com sucesso!');
        onClose();
      } catch (error: any) {
        console.error('Erro ao enviar convite ou criar cliente:', error);
        alert('Erro ao enviar convite ou criar cliente. Por favor, tente novamente.');
      }
      return;
    }

    // === FLUXO 2: EDIÇÃO DE CLIENTE ===
    if (onSave) {
      console.log('[AddClientDialog] Fluxo de edição (onSave)');
      console.log('[AddClientDialog] Parâmetros enviados para onSave:', { nome, email, telefone });
      await onSave({ nome, email, telefone });
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Adicionar ou Editar Cliente</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Preencha as informações abaixo para adicionar ou editar um cliente.
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
          type="tel"
          fullWidth
          variant="outlined"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
          required
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave} variant="contained">Salvar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddClientDialog; 