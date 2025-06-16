import { supabase } from '../../Supabase/supabaseRealtimeClient';

const url = process.env.REACT_APP_SUPABASE_URL;
const serviceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY;

// Tipagem para socorrista
export type SocorristaParams = {
  id?: number;
  user_id: string;
  nome: string;
  telefone: string;
  status?: string;
  email?: string;
  criado_em?: string;
  nome_empresa?: string;
};

// Cria um novo socorrista
export async function criarSocorrista({ user_id, nome, telefone, status = 'Ativo', email, nome_empresa }: SocorristaParams): Promise<boolean> {
  const body = { user_id, nome, telefone, status, email, nome_empresa };
  const response = await fetch(`${url}/rest/v1/socorrista`, {
    method: 'POST',
    headers: {
      'apikey': serviceKey as string,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    } as HeadersInit,
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error_description || data.message || `Erro ${response.status}`);
  }
  return true;
}

// Busca todos os socorristas
export async function buscarSocorristas(): Promise<SocorristaParams[]> {
  const response = await fetch(`${url}/rest/v1/socorrista`, {
    method: 'GET',
    headers: {
      'apikey': serviceKey as string,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json'
    } as HeadersInit
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error_description || data.message || `Erro ${response.status}`);
  }
  const data = await response.json();
  return data;
}

// Atualiza um socorrista existente
export async function updateSocorrista(id: number, updates: { nome?: string; email?: string; telefone?: string; status?: string; nome_empresa?: string }) {
  const response = await fetch(`${url}/rest/v1/socorrista?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'apikey': serviceKey as string,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    } as HeadersInit,
    body: JSON.stringify(updates)
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error_description || data.message || `Erro ${response.status}`);
  }
  return data[0];
}

// Remove um socorrista pelo id
export async function deleteSocorrista(id: number) {
  const response = await fetch(`${url}/rest/v1/socorrista?id=eq.${id}`, {
    method: 'DELETE',
    headers: {
      'apikey': serviceKey as string,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    } as HeadersInit
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error_description || data.message || `Erro ${response.status}`);
  }
  return true;
}

// Tipagem para familiar
export type FamiliarParams = {
  id?: number;
  user_id: string;
  cliente_id: number;
  nome: string;
  parentesco: string;
  telefone: string;
  email?: string;
  criado_em?: string;
};

// Cria um novo familiar
export async function criarFamiliar({ user_id, cliente_id, nome, parentesco, telefone, email }: FamiliarParams): Promise<boolean> {
  const body = { user_id, cliente_id, nome, parentesco, telefone, email };
  const accessToken = localStorage.getItem('userToken');
  const response = await fetch(`${url}/rest/v1/familiares`, {
    method: 'POST',
    headers: {
      'apikey': serviceKey as string,
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    } as HeadersInit,
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error_description || data.message || `Erro ${response.status}`);
  }
  return true;
}

// Busca todos os familiares
export async function buscarFamiliares(): Promise<FamiliarParams[]> {
  const response = await fetch(`${url}/rest/v1/familiares`, {
    method: 'GET',
    headers: {
      'apikey': serviceKey as string,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json'
    } as HeadersInit
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error_description || data.message || `Erro ${response.status}`);
  }
  const data = await response.json();
  return data;
}

// Atualiza um familiar existente
export async function updateFamiliar(id: number, updates: { nome?: string; email?: string; telefone?: string; parentesco?: string }) {
  const response = await fetch(`${url}/rest/v1/familiares?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'apikey': serviceKey as string,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    } as HeadersInit,
    body: JSON.stringify(updates)
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error_description || data.message || `Erro ${response.status}`);
  }
  return data[0];
}

// Remove um familiar pelo id
export async function deleteFamiliar(id: number) {
  const response = await fetch(`${url}/rest/v1/familiares?id=eq.${id}`, {
    method: 'DELETE',
    headers: {
      'apikey': serviceKey as string,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    } as HeadersInit
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error_description || data.message || `Erro ${response.status}`);
  }
  return true;
}

export async function atualizarFamiliar(id: string, dados: any) {
  const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
  const serviceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error('Configuração do Supabase ausente');
  const response = await fetch(`${supabaseUrl}/rest/v1/familiares?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(dados)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description || data.message || `Erro ${response.status}`);
  return data;
}

export async function marcarFamiliarComoDeletado(id: string) {
  const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
  const serviceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error('Configuração do Supabase ausente');
  const response = await fetch(`${supabaseUrl}/rest/v1/familiares?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({ deletado: true })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description || data.message || `Erro ${response.status}`);
  return data;
}

// Busca chamados onde notificacao_familiares contém o id do familiar
export async function buscarChamadosPorFamiliarId(familiarId: string) {
  const response = await fetch(`${url}/rest/v1/chamado?notificacao_familiares=cs.[{"id":"${familiarId}"}]`, {
    method: 'GET',
    headers: {
      'apikey': serviceKey as string,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    } as HeadersInit,
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error_description || data.message || `Erro ${response.status}`);
  }
  return data;
}

export async function buscarFamiliarPorEmail(email: string) {
  const response = await fetch(`${url}/rest/v1/familiares?email=eq.${encodeURIComponent(email)}`, {
    method: 'GET',
    headers: {
      'apikey': serviceKey as string,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    } as HeadersInit,
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error_description || data.message || `Erro ${response.status}`);
  }
  const data = await response.json();
  return Array.isArray(data) && data.length > 0 ? data[0] : null;
} 
