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
import { sendInvite } from '../Supabase/supabaseClient';
import { criarSocorrista } from './api';

interface AddPartnerDialogProps {
  open: boolean;
  onClose: () => void;
  initialData?: {
    empresa: string;
    contato: string;
    email: string;
    telefone: string;
  };
  onSave?: (data: { empresa: string; contato: string; email: string; telefone: string }) => Promise<void>;
  onCreate?: (data: { empresa: string; contato: string; email: string; telefone: string }) => void;
}

const AddPartnerDialog: React.FC<AddPartnerDialogProps> = ({ open, onClose, initialData, onSave, onCreate }) => {
  const [empresa, setEmpresa] = useState(initialData?.empresa || '');
  const [contato, setContato] = useState(initialData?.contato || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [telefone, setTelefone] = useState(initialData?.telefone || '');

  React.useEffect(() => {
    setEmpresa(initialData?.empresa || '');
    setContato(initialData?.contato || '');
    setEmail(initialData?.email || '');
    setTelefone(initialData?.telefone || '');
  }, [initialData, open]);

  const handleSave = async () => {
    if (!empresa || !contato || !email || !telefone) {
      alert('Por favor, preencha todos os campos.');
      return;
    }

    // === FLUXO 1: CRIAÇÃO DE SOCORRISTA ===
    if (!onSave) {
      try {
        console.log('[AddPartnerDialog] Fluxo de adição (sendInvite + criarSocorrista)');
        const inviteResponse = await sendInvite(email);
        alert('Convite enviado com sucesso!');
        const userId = inviteResponse.id;
        if (!userId) {
          alert('Erro: user_id não retornado pelo convite.');
          return;
        }
        await criarSocorrista({
          user_id: userId,
          nome: contato,
          telefone,
          email,
          status: 'Ativo',
          nome_empresa: empresa,
        });
        if (onCreate) {
          onCreate({ empresa, contato, email, telefone });
        }
        onClose();
      } catch (error) {
        console.error('Erro ao enviar convite ou criar socorrista:', error);
        alert('Erro ao enviar convite ou criar socorrista, tente novamente.');
      }
      return;
    }

    // === FLUXO 2: EDIÇÃO DE PARCEIRO ===
    await onSave({ empresa, contato, email, telefone });
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Adicionar Novo Parceiro</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Preencha as informações abaixo para adicionar um novo parceiro.
        </DialogContentText>
        <TextField
          autoFocus
          margin="dense"
          label="Empresa"
          type="text"
          fullWidth
          value={empresa}
          onChange={(e) => setEmpresa(e.target.value)}
        />
        <TextField
          margin="dense"
          label="Contato"
          type="text"
          fullWidth
          value={contato}
          onChange={(e) => setContato(e.target.value)}
        />
        <TextField
          margin="dense"
          label="Email"
          type="email"
          fullWidth
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <TextField
          margin="dense"
          label="Telefone"
          type="text"
          fullWidth
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Cancelar
        </Button>
        <Button onClick={handleSave} color="primary" variant="contained">
          Salvar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddPartnerDialog; 