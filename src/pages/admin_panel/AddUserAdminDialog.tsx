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

// Função para criar administrador
async function criarAdminUser({ user_id, nome, email, status = 'Ativo', perfil }: {
  user_id: string;
  nome: string;
  email: string;
  status?: string;
  perfil?: string;
}): Promise<boolean> {
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Variáveis de ambiente do Supabase não definidas');
  }
  const body = { user_id, nome, email, status, perfil };
  const response = await fetch(`${supabaseUrl}/rest/v1/administrador`, {
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

// Função para recuperação de senha
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

// Função para verificar se o administrador existe
async function verificarAdminExistente(email: string) {
  if (!supabaseUrl || !serviceKey) throw new Error('REACT_APP_SUPABASE_URL ou SERVICE_KEY não definida no .env');
  const response = await fetch(`${supabaseUrl}/rest/v1/administrador?email=eq.${encodeURIComponent(email)}`, {
    method: 'GET',
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json'
    }
  });
  if (!response.ok) {
    throw new Error('Erro ao verificar administrador existente');
  }
  const data = await response.json();
  return data[0] || null;
}

interface AddUserAdminDialogProps {
  open: boolean;
  onClose: () => void;
  initialData?: {
    nome: string;
    email: string;
    perfil?: string;
  };
  onSave?: (data: { nome: string; email: string; perfil: string; }) => Promise<void>;
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
      // Verificar se o administrador já existe
      const adminExistente = await verificarAdminExistente(email);
      
      if (adminExistente) {
        // Se o admin existe, enviar email de recuperação de senha
        await recoverPassword(email);
        alert('Este email já está cadastrado. Um email de recuperação de senha foi enviado.');
        onClose();
        return;
      }

      // 1. Enviar convite
      console.log('[AddUserAdminDialog] Enviando convite para:', email);
      const inviteResponse = await sendInvite(email);
      
      const userId = inviteResponse.id;
      if (!userId) {
        throw new Error('ID do usuário não retornado pelo convite.');
      }

      // 2. Criar admin
      console.log('[AddUserAdminDialog] Criando administrador para userId:', userId);
      await criarAdminUser({
        user_id: userId,
        nome,
        email,
        perfil,
        status: 'Ativo'
      });

      if (atualizarLista) await atualizarLista();
      alert('Convite enviado e administrador criado com sucesso!');
      onClose();
    } catch (error: any) {
      console.error('[AddUserAdminDialog] Erro:', error);
      
      // Tratamento específico para email duplicado
      if (error.message?.includes('duplicate key value') || error.code === '23505') {
        try {
          await recoverPassword(email);
          alert('Este email já está cadastrado. Um email de recuperação de senha foi enviado.');
        } catch (recoveryError) {
          alert('Este email já está cadastrado. Tente usar um email diferente ou entre em contato com o suporte.');
        }
      } else {
        alert(`Erro ao enviar convite/criar admin: ${error.message}`);
      }
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
