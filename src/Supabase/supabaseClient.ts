// Índice de Funções de API
// sendInvite: linha 15
// fetchUserByEmail: linha X
// addCliente: linha X
// createCliente: linha X
// As demais funções de API estão comentadas para teste.
// resetPassword: linha 66
// login: linha 94
// recoverPassword: linha 135
// fetchClientes: linha 163
// fetchParceiros: linha 190
// fetchAdminUsers: linha 225
// getUserDetails: linha 259
// Familiar (interface): linha 329
// addFamiliar: linha 340
// fetchFamiliares: linha 378

// Função para carregar chaves de variáveis de ambiente
const getSupabaseKeys = () => {
  // Carregar do .env
  const url = process.env.REACT_APP_SUPABASE_URL;
  const serviceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY;
  const serviceRoleKey = process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY;

  // LOGS DE DEPURAÇÃO
  console.log('[getSupabaseKeys] URL carregada:', url);
  console.log('[getSupabaseKeys] Service Key carregada:', serviceKey ? '***' : undefined);
  console.log('[getSupabaseKeys] Service Role Key carregada:', serviceRoleKey ? '***' : undefined);

  if (!url || !serviceKey) {
    throw new Error('Supabase URL or Service Key is not defined in environment variables');
  }
  // Retorna serviceRoleKey também, mas só será usado onde necessário
  return { url, serviceKey, serviceRoleKey };
};

// Função para enviar convite apenas com o email
// ATENÇÃO: Esta função aceita apenas o email como argumento
export const sendInvite = async (email: string) => {
  console.log('[sendInvite] Iniciando envio de convite:', { email });
  try {
    const { url, serviceKey, serviceRoleKey } = getSupabaseKeys();
    console.log('[sendInvite] URL utilizada:', url);
    console.log('[sendInvite] Service Key utilizada:', serviceKey ? '***' : undefined);
    console.log('[sendInvite] Service Role Key utilizada:', serviceRoleKey ? '***' : undefined);

    const response = await fetch(`${url}/auth/v1/invite`, {
      method: 'POST',
      headers: {
        // 'apikey' corresponde ao apikey do curl
        'apikey': serviceKey,
        // 'Authorization' corresponde ao service_role_key do curl
        'Authorization': `Bearer ${serviceRoleKey}`,
        // 'Content-Type' corresponde ao Content-Type do curl
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    });

    const data = await response.json();
    console.log('[sendInvite] Resposta do convite:', data);
    
    if (!response.ok) {
      throw new Error(data.error_description || data.message || `Erro ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('[sendInvite] Erro ao enviar convite:', error);
    throw error;
  }
};

export const resetPassword = async (newPassword: string, userToken: string) => {
    try {
      const { url, serviceKey } = getSupabaseKeys();
  
      const response = await fetch(`${url}/auth/v1/user`, {
        method: 'PUT',
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          password: newPassword
        })
      });
  
      const data = await response.json();
  
      if (!response.ok) {
        throw new Error(data.error_description || data.message || `Erro ${response.status}`);
      }
  
      return data;
    } catch (error) {
      throw error;
    }
  };

export const login = async (email: string, password: string) => {
  try {
    const { url, serviceKey } = getSupabaseKeys();

    const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        password
      })
    });

    const authData = await response.json();

    if (!response.ok) {
      throw new Error(authData.error_description || authData.message || `Erro ${response.status}`);
    }

    // Buscar informações adicionais do usuário com o token obtido
    const accessToken = authData.access_token;
    const userData = await getUserDetails(accessToken);
    
    // Armazenar o token e as informações do usuário no localStorage
    localStorage.setItem('userToken', accessToken);
    localStorage.setItem('userRole', userData?.role || '');
    localStorage.setItem('userData', JSON.stringify(userData));

    return {
      authData,
      userData
    };
  } catch (error) {
    console.error('Erro ao realizar login:', error);
    throw error;
  }
};

export const recoverPassword = async (email: string) => {
  try {
    const { url, serviceKey } = getSupabaseKeys();

    const response = await fetch(`${url}/auth/v1/recover`, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error_description || data.message || `Erro ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('Erro ao enviar recuperação de senha:', error);
    throw error;
  }
};

export const fetchClientes = async () => {
  try {
    const { url, serviceKey } = getSupabaseKeys();

    const response = await fetch(`${url}/rest/v1/user?perfil=eq.Cliente`, {
      method: 'GET',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        'Accept-Profile': 'vital_brasil'
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error_description || data.message || `Erro ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('Erro ao buscar clientes:', error);
    throw error;
  }
};

export const fetchParceiros = async () => {
  try {
    const { url, serviceKey } = getSupabaseKeys();

    const response = await fetch(`${url}/rest/v1/user?perfil=eq.Parceiro`, {
      method: 'GET',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        'Accept-Profile': 'vital_brasil'
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error_description || data.message || `Erro ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('Erro ao buscar parceiros:', error);
    throw error;
  }
};

// Definindo a interface para o usuário
interface User {
  id: string;
  email: string;
  role?: string;
  [key: string]: any; // Para outros campos que possam existir
}

export const fetchAdminUsers = async () => {
  try {
    const { url, serviceKey } = getSupabaseKeys();

    // Buscar todos os usuários administrativos, incluindo o campo last_sign_in_at
    const response = await fetch(`${url}/rest/v1/user?select=id,nome,email,perfil,last_sign_in_at`, {
      method: 'GET',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        'Accept-Profile': 'vital_brasil'
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error_description || data.message || `Erro ${response.status}`);
    }

    // Filtramos os usuários que não são clientes, parceiros e nem perfil nulo/vazio
    const adminUsers = data.filter(
      (user: User) => user.perfil !== 'Cliente' && user.perfil !== 'Parceiro' && user.perfil && user.perfil.trim() !== ''
    );

    return adminUsers;
  } catch (error) {
    console.error('Erro ao buscar usuários administrativos:', error);
    throw error;
  }
};

export const getUserDetails = async (userToken: string) => {
  try {
    const { url, serviceKey } = getSupabaseKeys();

    // Buscar o usuário na tabela user do schema vital_brasil
    const response = await fetch(`${url}/rest/v1/user?select=*`, {
      method: 'GET',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json',
        'Accept-Profile': 'vital_brasil'
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error_description || data.message || `Erro ${response.status}`);
    }

    // Retorna o primeiro usuário encontrado (deve ser o próprio usuário que fez login)
    return data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error('Erro ao buscar detalhes do usuário:', error);
    throw error;
  }
};

// Função para buscar usuário pelo email
export const fetchUserByEmail = async (email: string) => {
  try {
    const { url, serviceKey } = getSupabaseKeys();

    const response = await fetch(`${url}/rest/v1/user?email=eq.${encodeURIComponent(email)}`, {
      method: 'GET',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        'Accept-Profile': 'vital_brasil'
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error_description || data.message || `Erro ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('Erro ao buscar usuário por email:', error);
    throw error;
  }
};

// Interface para o tipo Familiar
export interface Familiar {
  id?: string;
  user_id: string;
  cliente_id: number;
  nome: string;
  parentesco: string;
  telefone: string;
  email: string;
  contato_emergencia: boolean;
  criado_em?: string;
}

export const addFamiliar = async (familiar: Familiar) => {
  console.log('Iniciando adição de familiar:', familiar);
  try {
    const { url, serviceKey } = getSupabaseKeys();
    const userToken = localStorage.getItem('userToken');

    if (!userToken) {
      throw new Error('Usuário não está autenticado');
    }

    const apiUrl = `${url}/rest/v1/familiares`;
    const headers = {
      'apikey': serviceKey,
      'Authorization': `Bearer ${userToken}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };
    const body = JSON.stringify([familiar]);

    // LOGS DETALHADOS
    console.log('[addFamiliar] API URL:', apiUrl);
    console.log('[addFamiliar] Headers:', headers);
    console.log('[addFamiliar] Request Body:', body);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error_description || data.message || `Erro ${response.status}`);
    }

    console.log('Familiar adicionado com sucesso:', data[0]);
    return data[0];
  } catch (error) {
    console.error('Erro ao adicionar familiar:', error);
    throw error;
  }
};

export const fetchFamiliares = async () => {
  try {
    const { url, serviceKey } = getSupabaseKeys();
    const userToken = localStorage.getItem('userToken');
    const clienteId = localStorage.getItem('clienteId');

    if (!userToken || !clienteId) {
      throw new Error('Usuário não está autenticado ou clienteId não encontrado');
    }

    const response = await fetch(`${url}/rest/v1/familiares?cliente_id=eq.${clienteId}&order=criado_em.desc`, {
      method: 'GET',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error_description || data.message || `Erro ${response.status}`);
    }

    console.log('Familiares encontrados:', data);
    return data;
  } catch (error) {
    console.error('Erro ao buscar familiares:', error);
    throw error;
  }
};

export const logoutSupabase = async () => {
  try {
    const { url, serviceKey } = getSupabaseKeys();
    const userToken = localStorage.getItem('userToken');
    if (!userToken) return;

    await fetch(`${url}/auth/v1/logout`, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Erro ao fazer logout no Supabase:', error);
  }
};

// Interface para o novo usuário
export interface NewUser {
  id: string;
  email: string;
  nome: string;
  telefone: string;
  status: string;
  perfil: string;
  // Adicione outros campos conforme necessário
}

export const addUser = async (user: NewUser) => {
  try {
    const { url, serviceKey } = getSupabaseKeys();
    const response = await fetch(`${url}/rest/v1/user`, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        'Content-Profile': 'vital_brasil',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify([user])
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error_description || data.message || `Erro ${response.status}`);
    }

    return data[0];
  } catch (error) {
    throw error;
  }
};

export const fetchAuthUserByToken = async (userToken: string) => {
  try {
    const { url, serviceKey } = getSupabaseKeys();
    const response = await fetch(`${url}/auth/v1/user`, {
      method: 'GET',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error_description || data.message || `Erro ${response.status}`);
    }
    return data;
  } catch (error) {
    console.error('Erro ao buscar usuário do Auth:', error);
    throw error;
  }
};

/**
 * Atualiza os dados de um usuário pelo ID.
 */
export const updateUser = async (
  id: string,
  updates: { nome?: string; email?: string; telefone?: string; status?: string; perfil?: string; empresa_nome?: string }
) => {
  try {
    const { url, serviceKey } = getSupabaseKeys();

    const response = await fetch(`${url}/rest/v1/user?id=eq.${id}` , {
      method: 'PATCH',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        'Content-Profile': 'vital_brasil',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(updates)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error_description || data.message || `Erro ${response.status}`);
    }

    return data[0];
  } catch (error) {
    throw error;
  }
};

/**
 * Remove um usuário pelo ID.
 */
export const deleteUser = async (id: string) => {
  try {
    const { url, serviceKey } = getSupabaseKeys();
    const response = await fetch(`${url}/rest/v1/user?id=eq.${id}`, {
      method: 'DELETE',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        'Content-Profile': 'vital_brasil',
      },
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error_description || data.message || `Erro ${response.status}`);
    }
    return true;
  } catch (error) {
    throw error;
  }
};

// Função para adicionar cliente
export const addCliente = async (user_id: string, nome: string, telefone: string, status: string) => {
  const { url, serviceKey } = getSupabaseKeys();
  const response = await fetch(`${url}/rest/v1/cliente`, {
    method: 'POST',
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      'Content-Profile': 'vital_brasil',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify([
      {
        user_id,
        nome,
        telefone,
        status
      }
    ])
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error_description || data.message || `Erro ${response.status}`);
  }
  return data[0];
};

// Função que orquestra o fluxo completo de criação de cliente
export const createCliente = async (clienteData: { email: string; nome: string; telefone: string }) => {
  try {
    console.log('Iniciando criação de cliente:', clienteData);
    
    // 1. Envia o convite apenas com o email
    await sendInvite(clienteData.email);
    console.log('Convite enviado para:', clienteData.email);

    // 2. Busca o usuário criado pelo email
    const userResponse = await fetchUserByEmail(clienteData.email);
    if (!userResponse || userResponse.length === 0) {
      throw new Error('Usuário não encontrado após criação');
    }
    
    console.log('Usuário encontrado:', userResponse[0]);

    // 3. Cria o registro na tabela cliente
    const clienteResponse = await addCliente(
      userResponse[0].id,
      clienteData.nome,
      clienteData.telefone,
      'Ativo'
    );

    console.log('Cliente criado com sucesso:', clienteResponse);
    return clienteResponse;
  } catch (error) {
    console.error('Erro no fluxo de criação de cliente:', error);
    throw error;
  }
};