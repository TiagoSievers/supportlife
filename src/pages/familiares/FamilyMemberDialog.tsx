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
import InputMask from 'react-input-mask';
import { criarFamiliar, buscarFamiliarPorEmail } from './api';
import { recoverPassword } from '../login/api';

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
    if (open) {
      console.log('[FamilyMemberDialog] Modal aberto:', {
        isEditing,
        initialData,
        formData: initialData || emptyMember
      });
      setFormData(initialData || emptyMember);
    }
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

    console.log('[FamilyMemberDialog] Tentando salvar:', {
      isEditing,
      formData
    });

    setLoading(true);
    try {
      if (isEditing && formData.id) {
        // Fluxo de edição
        console.log('[FamilyMemberDialog] Executando fluxo de edição');
        const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
        const serviceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY;
        const accessToken = localStorage.getItem('accessToken');

        if (!supabaseUrl || !serviceKey || !accessToken) {
          throw new Error('Configuração do Supabase ausente');
        }

        const response = await fetch(`${supabaseUrl}/rest/v1/familiares?id=eq.${formData.id}`, {
          method: 'PATCH',
          headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            nome: formData.name,
            parentesco: formData.relationship,
            telefone: formData.phone,
            email: formData.email,
            contato_emergencia: formData.isEmergencyContact
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          console.error('[FamilyMemberDialog] Erro ao atualizar:', {
            status: response.status,
            statusText: response.statusText,
            errorData
          });
          throw new Error(`Erro ao atualizar familiar: ${response.status} ${response.statusText}`);
        }

        alert('Familiar atualizado com sucesso!');
        onSave(formData);
      } else {
        // Fluxo de criação
        console.log('[FamilyMemberDialog] Executando fluxo de criação');
        const familiarExistente = await buscarFamiliarPorEmail(formData.email);
        
        if (familiarExistente) {
          if (familiarExistente.deletado) {
            // Reativar familiar deletado
            const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
            const serviceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY;
            const accessToken = localStorage.getItem('accessToken');

            if (!supabaseUrl || !serviceKey || !accessToken) {
              throw new Error('Configuração do Supabase ausente');
            }

            const response = await fetch(`${supabaseUrl}/rest/v1/familiares?id=eq.${familiarExistente.id}`, {
              method: 'PATCH',
              headers: {
                'apikey': serviceKey,
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
              },
              body: JSON.stringify({
                deletado: false,
                nome: formData.name,
                parentesco: formData.relationship,
                telefone: formData.phone,
                email: formData.email,
                contato_emergencia: formData.isEmergencyContact
              })
            });

            if (!response.ok) {
              throw new Error(`Erro ao reativar familiar: ${response.status} ${response.statusText}`);
            }

            await recoverPassword(formData.email);
            alert('Familiar reativado e atualizado. Um e-mail de redefinição de senha foi enviado.');
            onSave({ ...formData, id: familiarExistente.id });
          } else {
            alert('Já existe um familiar cadastrado com este e-mail.');
          }
        } else {
          // Criar novo familiar
          const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
          const serviceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY;
          const serviceRoleKey = process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY;
          const clienteId = localStorage.getItem('clienteId');

          if (!supabaseUrl || !serviceKey || !serviceRoleKey || !clienteId) {
            throw new Error('Configuração do Supabase ou clienteId ausente');
          }

          const inviteBody = { email: formData.email };
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
      }
    } catch (error: any) {
      console.error('[FamilyMemberDialog] Erro:', error);
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
              type="tel"
              fullWidth
              variant="outlined"
              required
              placeholder="(99) 99999-9999"
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
          required
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