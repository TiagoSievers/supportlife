import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Button
} from '@mui/material';
import InputMask from 'react-input-mask';

export interface Cliente {
  id: number;
  nome: string;
  email: string;
  telefone: string;
  status: string;
  perfil?: string;
  criado_em?: string;
}

interface ClientDialogProps {
  open: boolean;
  onClose: () => void;
  initialData?: Cliente;
  onSave: (data: Cliente) => void;
  isEditing?: boolean;
}

const emptyClient: Cliente = {
  id: 0,
  nome: '',
  email: '',
  telefone: '',
  status: 'ativo',
};

// Funções auxiliares para convite e criação
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const serviceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY;
const serviceRoleKey = process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY;

async function sendInvite(email: string) {
  if (!supabaseUrl || !serviceKey || !serviceRoleKey) {
    throw new Error('Variáveis de ambiente do Supabase não definidas');
  }
  const response = await fetch(`${supabaseUrl}/auth/v1/invite`, {
    method: 'POST',
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error_description || data.message || `Erro ${response.status}`);
  }
  return data;
}

async function criarCliente({ user_id, nome, telefone, status = 'Ativo', email }: { user_id: string, nome: string, telefone: string, status?: string, email?: string }) {
  if (!supabaseUrl || !serviceKey) throw new Error('REACT_APP_SUPABASE_URL ou SERVICE_KEY não definida no .env');
  const body = { user_id, nome, telefone, status, email };
  const response = await fetch(`${supabaseUrl}/rest/v1/cliente`, {
    method: 'POST',
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error_description || data.message || `Erro ${response.status}`);
  }
  return true;
}

// Função para recuperação de senha (adaptada de src/pages/login/api.ts)
async function recoverPassword(email: string) {
  if (!supabaseUrl || !serviceKey) throw new Error('REACT_APP_SUPABASE_URL ou SERVICE_KEY não definida no .env');
  const response = await fetch(`${supabaseUrl}/auth/v1/recover`, {
    method: 'POST',
    headers: {
      'apikey': serviceKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error_description || data.message || `Erro ${response.status}`);
  }
  return data;
}

const ClientDialog: React.FC<ClientDialogProps> = ({ open, onClose, initialData, onSave, isEditing }) => {
  const [formData, setFormData] = useState<Cliente>(initialData || emptyClient);
  const [loading, setLoading] = useState(false);

  // Limpar campos ao abrir para criação
  useEffect(() => {
    if (open) {
      if (!isEditing) {
        setFormData(emptyClient);
      } else if (initialData) {
        setFormData(initialData);
      }
    }
  }, [open, isEditing, initialData]);

  useEffect(() => {
    if (open && isEditing && initialData && initialData.id) {
      // ... fetch do cliente para edição ...
      const url = process.env.REACT_APP_SUPABASE_URL;
      const serviceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY;
      const accessToken = localStorage.getItem('accessToken');
      if (!url || !serviceKey) {
        console.error('REACT_APP_SUPABASE_URL ou REACT_APP_SUPABASE_SERVICE_KEY não definida no .env');
        return;
      }
      const headers = {
        apikey: serviceKey,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      };
      const fetchUrl = `${url}/rest/v1/cliente?select=*&id=eq.${initialData.id}`;
      fetch(fetchUrl, { headers })
        .then(res => res.json())
        .then(data => {
          if (data && data[0]) setFormData(data[0]);
        })
        .catch(err => {
          console.error('[API] Erro', err);
        });
    }
  }, [open, isEditing, initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    if (!formData.nome || !formData.email || !formData.telefone) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }
    setLoading(true);
    try {
      if (isEditing && formData.id) {
        // Atualização (já implementado)
        const url = process.env.REACT_APP_SUPABASE_URL;
        const serviceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY;
        const accessToken = localStorage.getItem('accessToken');
        if (!url || !serviceKey) throw new Error('REACT_APP_SUPABASE_URL ou REACT_APP_SUPABASE_SERVICE_KEY não definida no .env');
        const headers = {
          apikey: serviceKey,
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        };
        const response = await fetch(`${url}/rest/v1/cliente?id=eq.${formData.id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            nome: formData.nome,
            email: formData.email,
            telefone: formData.telefone,
            status: formData.status
          })
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error_description || data.message || `Erro ${response.status}`);
        }
        alert('Cliente atualizado com sucesso!');
        onSave(formData);
      } else {
        // Verificar se o cliente já existe e está deletado
        const url = process.env.REACT_APP_SUPABASE_URL;
        const serviceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY;
        if (!url || !serviceKey) throw new Error('REACT_APP_SUPABASE_URL ou REACT_APP_SUPABASE_SERVICE_KEY não definida no .env');
        const checkResponse = await fetch(`${url}/rest/v1/cliente?email=eq.${encodeURIComponent(formData.email)}`, {
          method: 'GET',
          headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`,
            'Content-Type': 'application/json'
          }
        });
        const existingClients = await checkResponse.json();
        const existingClient = existingClients[0];
        if (existingClient && existingClient.deletado) {
          // Cliente existe e está deletado, enviar convite de redefinição e reativar
          await recoverPassword(formData.email);
          // PATCH para deletado = false
          await fetch(`${url}/rest/v1/cliente?id=eq.${existingClient.id}`, {
            method: 'PATCH',
            headers: {
              'apikey': serviceKey,
              'Authorization': `Bearer ${serviceKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation'
            },
            body: JSON.stringify({ deletado: false })
          });
          alert('Convite de redefinição de senha enviado e cliente reativado com sucesso!');
          onSave({ ...formData, id: existingClient.id });
        } else {
          // Cliente não existe ou não está deletado, enviar convite e criar cliente
          const inviteResp = await sendInvite(formData.email);
          const user_id = inviteResp.user?.id || inviteResp.id;
          if (!user_id) throw new Error('ID do usuário não retornado pelo convite.');
          await criarCliente({
            user_id,
            nome: formData.nome,
            telefone: formData.telefone,
            status: formData.status,
            email: formData.email
          });
          alert('Cliente criado e convite enviado com sucesso!');
          onSave({ ...formData, id: 0 }); // id fictício, recarregue a lista se necessário
        }
      }
    } catch (error: any) {
      alert('Erro ao salvar cliente: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEditing ? 'Editar Cliente' : 'Adicionar Cliente'}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Nome Completo"
          name="nome"
          type="text"
          fullWidth
          variant="outlined"
          value={formData.nome}
          onChange={handleChange}
          required
        />
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
        <TextField
          margin="dense"
          label="Telefone"
          name="telefone"
          type="text"
          fullWidth
          variant="outlined"
          value={formData.telefone}
          onChange={handleChange}
          required
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
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave} variant="contained" disabled={loading}>Salvar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ClientDialog; 