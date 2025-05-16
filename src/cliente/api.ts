const url = process.env.REACT_APP_SUPABASE_URL;
const serviceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY;
const serviceRoleKey = process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY;

// Cria um novo cliente relacionado a um user_id
type CriarClienteParams = {
  user_id: string;
  nome: string;
  telefone: string;
  status?: string;
  email?: string;
};

export async function criarCliente({ user_id, nome, telefone, status = 'Ativo', email }: CriarClienteParams): Promise<boolean> {
  const body = { user_id, nome, telefone, status, email };
  console.log('[api/cliente] Enviando POST para /cliente:', body);
  const response = await fetch(`${url}/rest/v1/cliente`, {
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
    console.error('[api/cliente] Erro ao criar cliente:', data);
    throw new Error(data.error_description || data.message || `Erro ${response.status}`);
  }
  console.log('[api/cliente] Cliente criado com sucesso!');
  return true;
}

// Busca todos os clientes
export async function buscarClientes(): Promise<any[]> {
  const response = await fetch(`${url}/rest/v1/cliente`, {
    method: 'GET',
    headers: {
      'apikey': serviceKey as string,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json'
    } as HeadersInit
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    console.error('[api/cliente] Erro ao buscar clientes:', data);
    throw new Error(data.error_description || data.message || `Erro ${response.status}`);
  }
  const data = await response.json();
  console.log('[api/cliente] Clientes encontrados:', data);
  return data;
}

// Função para enviar convite para um email
export async function sendInvite(email: string) {
  console.log('[api/cliente] Iniciando envio de convite:', { email });
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
  console.log('[api/cliente] Resposta do convite:', data);
  if (!response.ok) {
    throw new Error(data.error_description || data.message || `Erro ${response.status}`);
  }
  return data;
}

// Atualiza um cliente existente
export async function updateCliente(id: number, updates: { nome?: string; email?: string; telefone?: string; status?: string }) {
  const response = await fetch(`${url}/rest/v1/cliente?id=eq.${id}`, {
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
    console.error('[api/cliente] Erro ao atualizar cliente:', data);
    throw new Error(data.error_description || data.message || `Erro ${response.status}`);
  }
  console.log('[api/cliente] Cliente atualizado com sucesso:', data[0]);
  return data[0];
}

// Remove um cliente pelo id
export async function deleteCliente(id: number) {
  const response = await fetch(`${url}/rest/v1/cliente?id=eq.${id}`, {
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
    console.error('[api/cliente] Erro ao excluir cliente:', data);
    throw new Error(data.error_description || data.message || `Erro ${response.status}`);
  }
  console.log('[api/cliente] Cliente excluído com sucesso!');
  return true;
} 