// Função utilitária para buscar endereço pelo Nominatim
export async function getAddressFromCoords(lat: number, lon: number): Promise<string | null> {
  const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=jsonv2`;
  // Lista de proxies CORS alternativos
  const corsProxies = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(nominatimUrl)}`,
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(nominatimUrl)}`,
    `https://corsproxy.io/?${encodeURIComponent(nominatimUrl)}`
  ];
  
  let lastError = null;
  
  // Tenta cada proxy até encontrar um que funcione
  for (const proxyUrl of corsProxies) {
    try {
      const response = await fetch(proxyUrl, {
      headers: {
        'User-Agent': 'SupportLife24h/1.0',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'Origin': window.location.origin
        }
    });
    
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }
    
    const data = await response.json();
    if (data && data.address) {
      const address = data.address;
      const rua = address.road || address.pedestrian || address.footway || address.cycleway || '';
      const numero = address.house_number || 's/n';
      const bairro = address.suburb || address.neighbourhood || address.village || address.town || '';
      const cidade = address.city || address.town || address.village || address.municipality || '';
      const estado = address.state || '';
      const cep = address.postcode || '';
      const ruaNumero = rua ? rua + ', ' + numero : '';
        
        const endereco = [
        ruaNumero,
        bairro,
        cidade,
        estado,
        cep
      ].filter(Boolean).join(', ');
        
        return endereco || data.display_name || null;
    }
    return data.display_name || null;
  } catch (error) {
      console.warn(`Erro ao tentar proxy ${proxyUrl}:`, error);
      lastError = error;
      continue; // Tenta o próximo proxy
  }
  }
  
  console.error('Todos os proxies falharam. Último erro:', lastError);
  return null;
} 
