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
