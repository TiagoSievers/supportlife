import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Button,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import { criarFamiliar, atualizarFamiliar, buscarFamiliarPorEmail } from './api';
import { recoverPassword } from '../login/api';
import InputMask from 'react-input-mask';

export interface FamilyMember {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email: string;
  isEmergencyContact: boolean;
}

interface FamilyMemberDialogProps {
  open: boolean;
  onClose: () => void;
  initialData?: FamilyMember;
  onSave: (data: FamilyMember) => void;
  isEditing?: boolean;
}

const emptyMember: FamilyMember = {
  id: '',
  name: '',
  relationship: '',
  phone: '',
  email: '',
  isEmergencyContact: false
};

const FamilyMemberDialog: React.FC<FamilyMemberDialogProps> = ({ open, onClose, initialData, onSave, isEditing }) => {
  const [formData, setFormData] = useState<FamilyMember>(initialData || emptyMember);
  const [loading, setLoading] = useState(false);
  let isSending = false; // lock para evitar múltiplos envios

  useEffect(() => {
    setFormData(initialData || emptyMember);
  }, [initialData, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSave = async () => {
    if (isSending) return;
    isSending = true;
    if (!formData.name || !formData.relationship || !formData.phone || !formData.email) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      isSending = false;
      return;
    }
    setLoading(true);
    try {
      // NOVO FLUXO: verifica se já existe familiar com o e-mail
      const familiarExistente = await buscarFamiliarPorEmail(formData.email);
      if (familiarExistente) {
        if (familiarExistente.deletado) {
          // Se deletado=true, reativa e entra no fluxo de edição
          await atualizarFamiliar(familiarExistente.id, { 
            deletado: false,
            nome: formData.name,
            parentesco: formData.relationship,
            telefone: formData.phone,
            email: formData.email,
            contato_emergencia: formData.isEmergencyContact
          });
          // Envia e-mail de redefinição de senha
          await recoverPassword(formData.email);
          alert('Familiar reativado e atualizado. Um e-mail de redefinição de senha foi enviado.');
          onSave({ ...formData, id: familiarExistente.id });
        } else {
          alert('Já existe um familiar cadastrado com este e-mail.');
        }
        setLoading(false);
        isSending = false;
        return;
      }
      // Fluxo normal de criação e convite
      if (isEditing) {
        // Fluxo de edição
        await atualizarFamiliar(formData.id, {
          nome: formData.name,
          parentesco: formData.relationship,
          telefone: formData.phone,
          email: formData.email,
          contato_emergencia: formData.isEmergencyContact
        });
        alert('Familiar atualizado com sucesso!');
        onSave(formData);
      } else {
        // Fluxo de criação
        const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
        const serviceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY;
        const serviceRoleKey = process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY;
        const clienteId = localStorage.getItem('clienteId');
        if (!supabaseUrl || !serviceKey || !serviceRoleKey || !clienteId) {
          throw new Error('Configuração do Supabase ou clienteId ausente');
        }
        const inviteBody = { email: formData.email };
        console.log('[FamilyMemberDialog] Enviando convite:', inviteBody);
        const resp = await fetch(`${supabaseUrl}/auth/v1/invite`, {
          method: 'POST',
          headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(inviteBody)
        });
        const data = await resp.json();
        if (!resp.ok) {
          throw new Error(data.error_description || data.message || `Erro ${resp.status}`);
        }
        console.log('[FamilyMemberDialog] Convite enviado:', data);
        const userId = data.id;
        if (!userId) throw new Error('ID do usuário não retornado pelo convite.');
        await criarFamiliar({
          user_id: userId,
          cliente_id: Number(clienteId),
          nome: formData.name,
          parentesco: formData.relationship,
          telefone: formData.phone,
          email: formData.email
        });
        alert('Convite enviado e familiar cadastrado com sucesso!');
        onSave({ ...formData, id: formData.id || `temp-${Date.now().toString()}` });
      }
    } catch (error: any) {
      alert('Erro ao salvar familiar: ' + error.message);
    } finally {
      setLoading(false);
      isSending = false;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEditing ? 'Editar Familiar' : 'Adicionar Familiar'}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Nome Completo"
          name="name"
          type="text"
          fullWidth
          variant="outlined"
          value={formData.name}
          onChange={handleChange}
          required
        />
        <TextField
          margin="dense"
          label="Parentesco"
          name="relationship"
          type="text"
          fullWidth
          variant="outlined"
          value={formData.relationship}
          onChange={handleChange}
          required
        />
        <InputMask
          mask="(99) 99999-9999"
          value={formData.phone}
          onChange={handleChange}
        >
          {(inputProps: any) => (
            <TextField
              {...inputProps}
              margin="dense"
              label="Celular"
              name="phone"
              type="text"
              fullWidth
              variant="outlined"
              required
            />
          )}
        </InputMask>
        <TextField
          margin="dense"
          label="Email"
          name="email"
          type="email"
          fullWidth
          variant="outlined"
          value={formData.email}
          onChange={handleChange}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave} variant="contained" disabled={loading}>Salvar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default FamilyMemberDialog; 