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
import { sendInvite } from '../../Supabase/supabaseClient';
import { criarSocorrista } from '../../socorristas/api';
import InputMask from 'react-input-mask';

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
  const [emailError, setEmailError] = useState('');
  const [telefone, setTelefone] = useState(initialData?.telefone || '');

  React.useEffect(() => {
    setEmpresa(initialData?.empresa || '');
    setContato(initialData?.contato || '');
    setEmail(initialData?.email || '');
    setTelefone(initialData?.telefone || '');
  }, [initialData, open]);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSave = async () => {
    if (!empresa || !contato || !email || !telefone) {
      alert('Por favor, preencha todos os campos.');
      return;
    }
    if (!validateEmail(email)) {
      setEmailError('Email inválido');
      return;
    }
    setEmailError('');
    // === FLUXO 2: EDIÇÃO DE PARCEIRO ===
    if (onSave) {
      await onSave({ empresa, contato, email, telefone });
      return;
    }
    // === FLUXO 1: CRIAÇÃO DE SOCORRISTA ===
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
    } catch (error: any) {
      console.error('Erro ao enviar convite ou criar socorrista:', error);
      // Verifica se o erro é de e-mail duplicado
      if (error?.message?.includes('duplicate') || error?.message?.includes('already registered') || error?.message?.includes('email') || error?.message?.includes('23505')) {
        alert('Este e-mail já está em uso.');
      } else {
        alert('Erro ao enviar convite ou criar socorrista, tente novamente.');
      }
    }
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
          label="Nome do socorrista"
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
          onChange={(e) => {
            setEmail(e.target.value);
            if (!validateEmail(e.target.value)) {
              setEmailError('Email inválido');
            } else {
              setEmailError('');
            }
          }}
          error={!!emailError}
          helperText={emailError}
        />
        <TextField
          margin="dense"
          label="Telefone"
          type="text"
          fullWidth
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
          InputProps={{
            inputComponent: InputMask as any,
            inputProps: {
              mask: '(99) 99999-9999',
              maskChar: null
            }
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Cancelar
        </Button>
        <Button onClick={handleSave} color="primary" variant="contained" disabled={!!emailError || !email}>
          Salvar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddPartnerDialog; 
