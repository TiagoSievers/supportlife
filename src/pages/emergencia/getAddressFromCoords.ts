// Função utilitária para buscar endereço pelo Nominatim
export async function getAddressFromCoords(lat: number, lon: number): Promise<string | null> {
  const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=jsonv2`;
  // Usando um proxy CORS público (apenas para desenvolvimento)
  const corsProxyUrl = `https://corsproxy.io/?${encodeURIComponent(nominatimUrl)}`;
  
  try {
    const response = await fetch(corsProxyUrl, {
      headers: {
        'User-Agent': 'SupportLife24h/1.0',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'Origin': window.location.origin
      },
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
      return [
        ruaNumero,
        bairro,
        cidade,
        estado,
        cep
      ].filter(Boolean).join(', ');
    }
    return data.display_name || null;
  } catch (error) {
    console.error('Erro ao buscar endereço:', error);
    return null;
  }
} 
