// Função utilitária para buscar endereço pelo Nominatim
export async function getAddressFromCoords(lat: number, lon: number): Promise<string | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=jsonv2`;
  try {
    const response = await fetch(url);
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
    return null;
  }
} 