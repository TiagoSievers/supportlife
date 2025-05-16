import { supabase } from '../Supabase/supabaseRealtimeClient';
const url = process.env.REACT_APP_SUPABASE_URL;
const serviceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY;
const serviceRoleKey = process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY;

export type AdminUserParams = {
  id?: number;
  user_id: string;
  nome: string;
  email: string;
  perfil?: string;
  status?: string;
  data_cadastro?: string;
};

// Buscar todos os administradores
export async function buscarAdminUsers(): Promise<AdminUserParams[]> {
  const response = await fetch(`${url}/rest/v1/administrador`, {
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

// Criar novo administrador
export async function criarAdminUser({ user_id, nome, email, status = 'Ativo', perfil }: AdminUserParams): Promise<boolean> {
  const body = { user_id, nome, email, status, perfil };
  const response = await fetch(`${url}/rest/v1/administrador`, {
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

// Função para enviar convite para um email (padrão cliente)
export async function sendInvite(email: string) {
  console.log('[api/user_admin] Iniciando envio de convite:', { email });
  if (!url || !serviceKey || !serviceRoleKey) {
    throw new Error('Variáveis de ambiente do Supabase não definidas');
  }
  const response = await fetch(`${url}/auth/v1/invite`, {
    method: 'POST',
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email })
  });
  const data = await response.json();
  console.log('[api/user_admin] Resposta do convite:', data);
  if (!response.ok) {
    throw new Error(data.error_description || data.message || `Erro ${response.status}`);
  }
  return data;
}

// Atualizar administrador (com logs)
export async function updateAdminUser(id: number, updates: { nome?: string; email?: string; perfil?: string; status?: string }) {
  console.log('[api/user_admin] Atualizando admin:', { id, updates });
  const response = await fetch(`${url}/rest/v1/administrador?id=eq.${id}`, {
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
    console.error('[api/user_admin] Erro ao atualizar admin:', data);
    throw new Error(data.error_description || data.message || `Erro ${response.status}`);
  }
  console.log('[api/user_admin] Admin atualizado com sucesso:', data[0]);
  return data[0];
}

// Remover administrador (com logs)
export async function deleteAdminUser(id: number) {
  console.log('[api/user_admin] Removendo admin:', id);
  const response = await fetch(`${url}/rest/v1/administrador?id=eq.${id}`, {
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
    console.error('[api/user_admin] Erro ao excluir admin:', data);
    throw new Error(data.error_description || data.message || `Erro ${response.status}`);
  }
  console.log('[api/user_admin] Admin excluído com sucesso!');
  return true;
}

// Ativa o realtime na tabela administrador
export function subscribeToAdminUsers(callback: (payload: any) => void) {
  return supabase
    .channel('public:administrador')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'administrador' }, callback)
    .subscribe();
} 