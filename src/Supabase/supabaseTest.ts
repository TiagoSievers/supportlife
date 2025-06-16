// Função para carregar chaves de variáveis de ambiente (cópia para teste)
const getSupabaseKeys = () => {
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
  return { url, serviceKey, serviceRoleKey };
};

// Função para enviar convite de teste
export const sendInviteTest = async (email: string) => {
  console.log('[sendInviteTest] Iniciando envio de convite:', { email });
  try {
    const { url, serviceKey, serviceRoleKey } = getSupabaseKeys();
    console.log('[sendInviteTest] URL utilizada:', url);
    console.log('[sendInviteTest] Service Key utilizada:', serviceKey ? '***' : undefined);
    console.log('[sendInviteTest] Service Role Key utilizada:', serviceRoleKey ? '***' : undefined);

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
    console.log('[sendInviteTest] Resposta do convite:', data);
    
    if (!response.ok) {
      throw new Error(data.error_description || data.message || `Erro ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('[sendInviteTest] Erro ao enviar convite:', error);
    throw error;
  }
};

// Função para criar cliente na tabela cliente usando o user_id retornado do convite
export const criarClienteComUserId = async (user_id: string, nome: string, telefone: string, status: string = 'Ativo') => {
  console.log('[criarClienteComUserId] Dados recebidos:', { user_id, nome, telefone, status });
  const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzcW96c2h1Y2pzZ21mZ2FvaWFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY3OTI4OTUsImV4cCI6MjA2MjM2ODg5NX0.DMNalkURt6sp2g21URpXfcY4ts53cLxbMR_spk-TgvQ';
  const url = 'https://usqozshucjsgmfgaoiad.supabase.co/rest/v1/cliente';

  const body = [{
    user_id,
    nome,
    telefone,
    status
  }];

  console.log('[criarClienteComUserId] Enviando POST para /cliente:', body);
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': anonKey,
      'Authorization': `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(body)
  });

  let responseData = null;
  if (!response.ok) {
    responseData = await response.json().catch(() => ({}));
    console.error('[criarClienteComUserId] Erro na resposta da API:', responseData);
    throw new Error(responseData.error_description || responseData.message || `Erro ${response.status}`);
  }

  try {
    responseData = await response.json();
    console.log('[criarClienteComUserId] Resposta da API:', responseData);
  } catch {
    // Se não houver body, não faz nada
    responseData = null;
  }

  console.log('[criarClienteComUserId] Cliente criado com sucesso!');
  return true;
}; 
