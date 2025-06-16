const url = process.env.REACT_APP_SUPABASE_URL;
const serviceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY;

export type CriarChamadoParams = {
  cliente_id: number;
  socorrista_id: number;
  operador_id: number;
  supervisor_id: number;
  status: string;
  descricao: string;
  localizacao: string;
  posicao_inicial_socorrista?: string;
};

export async function criarChamado(params: CriarChamadoParams): Promise<boolean> {
  console.log('[api/chamado] Enviando POST para /chamado:', params);
  const response = await fetch(`${url}/rest/v1/chamado`, {
    method: 'POST',
    headers: {
      'apikey': serviceKey as string,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    } as HeadersInit,
    body: JSON.stringify(params)
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    console.error('[api/chamado] Erro ao criar chamado:', data);
    throw new Error(data.error_description || data.message || `Erro ${response.status}`);
  }
  console.log('[api/chamado] Chamado criado com sucesso!');
  return true;
} 
