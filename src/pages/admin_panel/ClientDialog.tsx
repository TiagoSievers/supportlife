import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  Button,
  CircularProgress
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
async function criarCliente({ 
  user_id, 
  nome, 
  telefone, 
  email, 
  status = 'Ativo',
  endereco 
}: {
  user_id: string;
  nome: string;
  telefone: string;
  email: string;
  status?: string;
  endereco: Endereco;
}) {
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Variáveis de ambiente do Supabase não definidas');
  }
  const body = { 
    user_id, 
    nome, 
    telefone, 
    email, 
    status,
    endereco // envia o objeto inteiro
  };
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
async function atualizarCliente(id: number, dados: { 
  nome: string; 
  email: string; 
  telefone: string; 
  status?: string;
  endereco: Endereco;
}) {
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

interface Endereco {
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  estado: string;
  numero: string;
  complemento: string;
  ponto_referencia: string;
}

export interface Cliente {
  id: number;
  nome: string;
  email: string;
  telefone: string;
  status: string;
  endereco?: Endereco;
}

// Função para buscar endereço por CEP
async function buscarEnderecoPorCEP(cep: string) {
  const cepLimpo = cep.replace(/\D/g, '');
  if (cepLimpo.length !== 8) return null;

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
    const data = await response.json();
    
    if (data.erro) return null;
    
    return {
      cep: data.cep,
      logradouro: data.logradouro,
      bairro: data.bairro,
      cidade: data.localidade,
      estado: data.uf
    };
  } catch (error) {
    console.error('Erro ao buscar CEP:', error);
    return null;
  }
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
  
  // Novos estados para endereço
  const [cep, setCep] = useState(initialData?.endereco?.cep || '');
  const [logradouro, setLogradouro] = useState(initialData?.endereco?.logradouro || '');
  const [bairro, setBairro] = useState(initialData?.endereco?.bairro || '');
  const [cidade, setCidade] = useState(initialData?.endereco?.cidade || '');
  const [estado, setEstado] = useState(initialData?.endereco?.estado || '');
  const [numero, setNumero] = useState(initialData?.endereco?.numero || '');
  const [complemento, setComplemento] = useState(initialData?.endereco?.complemento || '');
  const [pontoReferencia, setPontoReferencia] = useState(initialData?.endereco?.ponto_referencia || '');
  const [loadingCep, setLoadingCep] = useState(false);

  // Adicione um estado para erro de e-mail
  const [emailError, setEmailError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setNome(initialData?.nome || '');
      setEmail(initialData?.email || '');
      setTelefone(initialData?.telefone || '');
      setCep(initialData?.endereco?.cep || '');
      setLogradouro(initialData?.endereco?.logradouro || '');
      setBairro(initialData?.endereco?.bairro || '');
      setCidade(initialData?.endereco?.cidade || '');
      setEstado(initialData?.endereco?.estado || '');
      setNumero(initialData?.endereco?.numero || '');
      setComplemento(initialData?.endereco?.complemento || '');
      setPontoReferencia(initialData?.endereco?.ponto_referencia || '');
    }
  }, [initialData, open]);

  const handleCepBlur = async () => {
    if (cep.length >= 8) {
      setLoadingCep(true);
      const endereco = await buscarEnderecoPorCEP(cep);
      if (endereco) {
        setLogradouro(endereco.logradouro);
        setBairro(endereco.bairro);
        setCidade(endereco.cidade);
        setEstado(endereco.estado);
      } else {
        alert('CEP não encontrado. Por favor, verifique o CEP informado.');
      }
      setLoadingCep(false);
    }
  };

  // Função para validar e-mail
  function validateEmail(email: string) {
    const re = /^(([^<>()\[\]\\.,;:\s@\"]+(\.[^<>()\[\]\\.,;:\s@\"]+)*)|(".+"))@(([^<>()[\]\\.,;:\s@\"]+\.)+[^<>()[\]\\.,;:\s@\"]{2,})$/i;
    return re.test(String(email).toLowerCase());
  }

  const handleSave = async () => {
    if (!nome || !email || !telefone || !cep || !logradouro || !bairro || !cidade || !estado || !numero) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    const enderecoData = {
      cep,
      logradouro,
      bairro,
      cidade,
      estado,
      numero,
      complemento,
      ponto_referencia: pontoReferencia
    };

    setLoading(true);
    try {
      console.log('[ClientDialog] Iniciando operação de', isEditing ? 'edição' : 'criação');

      if (isEditing && initialData?.id) {
        console.log('[ClientDialog] Atualizando cliente:', initialData.id);
        const clienteAtualizado = await atualizarCliente(initialData.id, {
          nome,
          email,
          telefone,
          status: 'ativo',
          endereco: enderecoData
        });
        
        alert('Cliente atualizado com sucesso!');
        onSave(clienteAtualizado[0]);
      } else {
        // Verificar se o cliente já existe
        console.log('[ClientDialog] Verificando cliente existente:', email);
        const clienteExistente = await verificarClienteExistente(email);

        if (clienteExistente) {
          alert('Este e-mail já está em uso.');
          setLoading(false);
          return;
        }

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
          status: 'ativo',
          endereco: enderecoData
        });

        alert('Cliente criado e convite enviado com sucesso!');
        onSave(novoCliente[0]);
      }

      onClose();
    } catch (error: any) {
      console.error('[ClientDialog] Erro:', error);
      if (error.message?.includes('duplicate') || error.message?.includes('already registered') || error.message?.includes('email') || error.message?.includes('23505')) {
        alert('Este e-mail já está em uso.');
      } else {
        alert(`Erro ao ${isEditing ? 'atualizar' : 'criar'} cliente: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
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
          onChange={(e) => {
            setEmail(e.target.value);
            if (!validateEmail(e.target.value)) {
              setEmailError('Digite um e-mail válido');
            } else {
              setEmailError(null);
            }
          }}
          required
          error={!!emailError}
          helperText={emailError}
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
        <TextField
          margin="dense"
          label="CEP"
          type="text"
          fullWidth
          variant="outlined"
          value={cep}
          onChange={(e) => setCep(e.target.value)}
          onBlur={handleCepBlur}
          required
          InputProps={{
            inputComponent: InputMask as any,
            inputProps: {
              mask: '99999-999',
              maskChar: null
            },
            endAdornment: loadingCep ? <CircularProgress size={20} /> : null
          }}
        />
        <TextField
          margin="dense"
          label="Logradouro"
          type="text"
          fullWidth
          variant="outlined"
          value={logradouro}
          onChange={(e) => setLogradouro(e.target.value)}
          required
          disabled={loadingCep}
        />
        <TextField
          margin="dense"
          label="Número"
          type="text"
          fullWidth
          variant="outlined"
          value={numero}
          onChange={(e) => setNumero(e.target.value)}
          required
        />
        <TextField
          margin="dense"
          label="Complemento"
          type="text"
          fullWidth
          variant="outlined"
          value={complemento}
          onChange={(e) => setComplemento(e.target.value)}
        />
        <TextField
          margin="dense"
          label="Bairro"
          type="text"
          fullWidth
          variant="outlined"
          value={bairro}
          onChange={(e) => setBairro(e.target.value)}
          required
          disabled={loadingCep}
        />
        <TextField
          margin="dense"
          label="Cidade"
          type="text"
          fullWidth
          variant="outlined"
          value={cidade}
          onChange={(e) => setCidade(e.target.value)}
          required
          disabled={loadingCep}
        />
        <TextField
          margin="dense"
          label="Estado"
          type="text"
          fullWidth
          variant="outlined"
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
          required
          disabled={loadingCep}
        />
        <TextField
          margin="dense"
          label="Ponto de Referência"
          type="text"
          fullWidth
          variant="outlined"
          value={pontoReferencia}
          onChange={(e) => setPontoReferencia(e.target.value)}
          multiline
          rows={2}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button 
          onClick={handleSave} 
          variant="contained" 
          disabled={loading || !!emailError}
        >
          {loading ? 'Salvando...' : 'Salvar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ClientDialog; 
