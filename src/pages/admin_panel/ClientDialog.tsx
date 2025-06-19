import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  Button
} from '@mui/material';
import InputMask from 'react-input-mask';

// Configurações do Supabase
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const serviceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY;
const serviceRoleKey = process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY;

// Função para enviar convite
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

// Função para criar cliente
async function criarCliente({ user_id, nome, telefone, email, status = 'Ativo' }: {
  user_id: string;
  nome: string;
  telefone: string;
  email: string;
  status?: string;
}) {
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Variáveis de ambiente do Supabase não definidas');
  }
  const body = { user_id, nome, telefone, email, status };
  const response = await fetch(`${supabaseUrl}/rest/v1/cliente`, {
    method: 'POST',
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error_description || data.message || `Erro ${response.status}`);
  }
  return response.json();
}

// Função para verificar cliente existente
async function verificarClienteExistente(email: string) {
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Variáveis de ambiente do Supabase não definidas');
  }
  const response = await fetch(`${supabaseUrl}/rest/v1/cliente?email=eq.${encodeURIComponent(email)}`, {
    method: 'GET',
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json'
    }
  });
  if (!response.ok) {
    throw new Error('Erro ao verificar cliente existente');
  }
  const data = await response.json();
  return data[0] || null;
}

// Função para atualizar cliente
async function atualizarCliente(id: number, dados: { nome: string; email: string; telefone: string; status?: string }) {
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Variáveis de ambiente do Supabase não definidas');
  }
  const response = await fetch(`${supabaseUrl}/rest/v1/cliente?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(dados)
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error_description || data.message || `Erro ${response.status}`);
  }
  return response.json();
}

export interface Cliente {
  id: number;
  nome: string;
  email: string;
  telefone: string;
  status: string;
}

interface ClientDialogProps {
  open: boolean;
  onClose: () => void;
  initialData?: Cliente;
  onSave: (data: Cliente) => void;
  isEditing?: boolean;
}

const ClientDialog: React.FC<ClientDialogProps> = ({ open, onClose, initialData, onSave, isEditing }) => {
  const [nome, setNome] = useState(initialData?.nome || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [telefone, setTelefone] = useState(initialData?.telefone || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setNome(initialData?.nome || '');
      setEmail(initialData?.email || '');
      setTelefone(initialData?.telefone || '');
    }
  }, [initialData, open]);

  const handleSave = async () => {
    if (!nome || !email || !telefone) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    setLoading(true);
    try {
      console.log('[ClientDialog] Iniciando operação de', isEditing ? 'edição' : 'criação');

      if (isEditing && initialData?.id) {
        console.log('[ClientDialog] Atualizando cliente:', initialData.id);
        const clienteAtualizado = await atualizarCliente(initialData.id, {
          nome,
          email,
          telefone,
          status: 'ativo'
        });
        
        alert('Cliente atualizado com sucesso!');
        onSave(clienteAtualizado[0]);
      } else {
        // Verificar se o cliente já existe
        console.log('[ClientDialog] Verificando cliente existente:', email);
        const clienteExistente = await verificarClienteExistente(email);

        if (clienteExistente?.deletado) {
          console.log('[ClientDialog] Reativando cliente deletado:', clienteExistente.id);
          const clienteReativado = await atualizarCliente(clienteExistente.id, {
            nome,
            email,
            telefone,
            status: 'ativo'
          });
          
          alert('Cliente reativado com sucesso!');
          onSave(clienteReativado[0]);
        } else if (clienteExistente) {
          throw new Error('Este email já está cadastrado para outro cliente.');
        } else {
          // Criar novo cliente
          console.log('[ClientDialog] Enviando convite para novo cliente');
          const inviteResponse = await sendInvite(email);
          const userId = inviteResponse.user?.id || inviteResponse.id;

          if (!userId) {
            throw new Error('ID do usuário não retornado pelo convite.');
          }

          console.log('[ClientDialog] Criando novo cliente para userId:', userId);
          const novoCliente = await criarCliente({
            user_id: userId,
            nome,
            telefone,
            email,
            status: 'ativo'
          });

          alert('Cliente criado e convite enviado com sucesso!');
          onSave(novoCliente[0]);
        }
      }

      onClose();
    } catch (error: any) {
      console.error('[ClientDialog] Erro:', error);
      alert(`Erro ao ${isEditing ? 'atualizar' : 'criar'} cliente: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEditing ? 'Editar Cliente' : 'Adicionar Cliente'}</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {isEditing 
            ? 'Edite as informações do cliente abaixo.'
            : 'Preencha as informações abaixo para adicionar um novo cliente.'}
        </DialogContentText>
        <TextField
          autoFocus
          margin="dense"
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
          label="Telefone"
          type="text"
          fullWidth
          variant="outlined"
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
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button 
          onClick={handleSave} 
          variant="contained" 
          disabled={loading}
        >
          {loading ? 'Salvando...' : 'Salvar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ClientDialog; 
