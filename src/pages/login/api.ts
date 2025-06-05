// API de autenticação para a página de login

// Função utilitária para obter as chaves do Supabase
export function getSupabaseKeys() {
  const url = process.env.REACT_APP_SUPABASE_URL;
  const serviceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY;
  const serviceRoleKey = process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Supabase URL or Service Key is not defined in environment variables');
  }
  return { url, serviceKey, serviceRoleKey };
}

// Buscar informações adicionais do usuário com o token obtido
export async function getUserDetails(userToken: string) {
  const { url, serviceKey } = getSupabaseKeys();
  const response = await fetch(`${url}/rest/v1/user?select=*`, {
    method: 'GET',
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${userToken}`,
      'Content-Type': 'application/json',
      'Accept-Profile': 'vital_brasil',
    },
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error_description || data.message || `Erro ${response.status}`);
  }
  return data.length > 0 ? data[0] : null;
}

// Função para buscar usuário pelo email
export async function fetchUserByEmail(email: string) {
  const { url, serviceKey } = getSupabaseKeys();
  const response = await fetch(`${url}/rest/v1/user?email=eq.${encodeURIComponent(email)}`, {
    method: 'GET',
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      'Accept-Profile': 'vital_brasil',
    },
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error_description || data.message || `Erro ${response.status}`);
  }
  return data;
}

// Função de login
export async function login(email: string, password: string) {
  const { url, serviceKey } = getSupabaseKeys();
  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'apikey': serviceKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });
  const authData = await response.json();
  if (!response.ok) {
    throw new Error(authData.error_description || authData.message || `Erro ${response.status}`);
  }
  const accessToken = authData.access_token;
  localStorage.setItem('accessToken', accessToken);
  return { authData };
}

// Função para recuperação de senha
export async function recoverPassword(email: string) {
  const { url, serviceKey } = getSupabaseKeys();
  const response = await fetch(`${url}/auth/v1/recover`, {
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

export async function existsInCliente(user_id: string) {
  const { url, serviceKey } = getSupabaseKeys();
  const response = await fetch(`${url}/rest/v1/cliente?user_id=eq.${user_id}&deletado=is.false`, {
    method: 'GET',
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
  });
  const data = await response.json();
  return Array.isArray(data) && data.length > 0;
}

export async function existsInSocorrista(user_id: string) {
  const { url, serviceKey } = getSupabaseKeys();
  const response = await fetch(`${url}/rest/v1/socorrista?user_id=eq.${user_id}&deletado=is.false`, {
    method: 'GET',
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
  });
  const data = await response.json();
  return Array.isArray(data) && data.length > 0;
}

export async function existsInAdministrador(user_id: string) {
  const { url, serviceKey } = getSupabaseKeys();
  const response = await fetch(`${url}/rest/v1/administrador?user_id=eq.${user_id}&deletado=is.false`, {
    method: 'GET',
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
  });
  const data = await response.json();
  return Array.isArray(data) && data.length > 0;
}

export async function getClienteByUserId(user_id: string) {
  const { url, serviceKey } = getSupabaseKeys();
  const response = await fetch(`${url}/rest/v1/cliente?user_id=eq.${user_id}`, {
    method: 'GET',
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error_description || data.message || `Erro ${response.status}`);
  }
  return Array.isArray(data) && data.length > 0 ? data[0] : null;
}

export async function getSocorristaByUserId(user_id: string) {
  const { url, serviceKey } = getSupabaseKeys();
  const response = await fetch(`${url}/rest/v1/socorrista?user_id=eq.${user_id}` , {
    method: 'GET',
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error_description || data.message || `Erro ${response.status}`);
  }
  return Array.isArray(data) && data.length > 0 ? data[0] : null;
}

export async function getAdministradorByUserId(user_id: string) {
  const { url, serviceKey } = getSupabaseKeys();
  const response = await fetch(`${url}/rest/v1/administrador?user_id=eq.${user_id}`, {
    method: 'GET',
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error_description || data.message || `Erro ${response.status}`);
  }
  return Array.isArray(data) && data.length > 0 ? data[0] : null;
}

export async function existsInFamiliar(user_id: string) {
  const { url, serviceKey } = getSupabaseKeys();
  const response = await fetch(`${url}/rest/v1/familiares?user_id=eq.${user_id}`, {
    method: 'GET',
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
  });
  const data = await response.json();
  return Array.isArray(data) && data.length > 0;
}

export async function getFamiliarByUserId(user_id: string) {
  const { url, serviceKey } = getSupabaseKeys();
  const response = await fetch(`${url}/rest/v1/familiares?user_id=eq.${user_id}`, {
    method: 'GET',
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error_description || data.message || `Erro ${response.status}`);
  }
  return Array.isArray(data) && data.length > 0 ? data[0] : null;
} 