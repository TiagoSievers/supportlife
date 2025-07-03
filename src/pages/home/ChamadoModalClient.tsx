import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box, RadioGroup, FormControlLabel, Radio, FormControl, CircularProgress } from '@mui/material';
import MapPatner from './MapPatnerClient';
import { useNavigate } from 'react-router-dom';
import { getAddressFromCoords } from './getAddressFromCoords';

const endereco = "Rua XV de Novembro, 15, Centro, Curitiba, PR, 80020-310, Brasil";
const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(endereco)}`;

interface Chamado {
  id?: number;
  cliente_id: number;
  localizacao: string;
  endereco_textual: string;
  status: string;
}

interface Endereco {
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  ponto_referencia?: string;
}

interface Cliente {
  id: number;
  endereco: Endereco;
}

interface ChamadoModalProps {
  open: boolean;
  onClose: () => void;
}

const formatarEndereco = (endereco: Endereco): string => {
  const partes = [
    endereco.logradouro,
    endereco.numero,
    endereco.complemento,
    endereco.bairro,
    endereco.cidade,
    endereco.estado,
    endereco.cep
  ].filter(Boolean); // Remove valores vazios ou undefined

  let enderecoFormatado = partes.join(', ');
  
  if (endereco.ponto_referencia) {
    enderecoFormatado += ` (Próximo a ${endereco.ponto_referencia})`;
  }
  
  return enderecoFormatado;
};

const buscarGeolocalizacaoEndereco = async (enderecoObj: Endereco) => {
  const enderecoStr = [
    enderecoObj.logradouro,
    enderecoObj.numero,
    enderecoObj.bairro,
    enderecoObj.cidade,
    enderecoObj.estado,
    enderecoObj.cep
  ].filter(Boolean).join(', ');
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(enderecoStr)}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data && data[0]) {
      return {
        latitude: data[0].lat,
        longitude: data[0].lon,
        enderecoFormatado: enderecoStr
      };
    }
  } catch (e) {
    console.error('Erro ao buscar geolocalização:', e);
  }
  return null;
};

const ChamadoModalClient: React.FC<ChamadoModalProps> = ({ open, onClose }) => {
  console.log('ChamadoModalClient MONTADO');
  console.log('URL Nominatim:', url);
  const navigate = useNavigate();
  const [localizacaoEscolhida, setLocalizacaoEscolhida] = useState<'atual' | 'cadastrada'>('atual');
  const [mostrarMapa, setMostrarMapa] = useState(true);
  const [chamado, setChamado] = useState<Chamado | null>(null);
  const [loading, setLoading] = useState(false);
  const [enderecoRegistrado, setEnderecoRegistrado] = useState<string | null>(null);
  const [cliente, setCliente] = useState<Cliente | null>(null);

  useEffect(() => {
    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (data && data[0]) {
          console.log('Coordenadas:', data[0].lat, data[0].lon);
        } else {
          console.log('Nenhum resultado encontrado na Nominatim');
        }
      })
      .catch(err => {
        console.error('Erro ao buscar Nominatim:', err);
      });
  }, []);

  useEffect(() => {
    const buscarEnderecoCliente = async () => {
      if (!open) return;
      // Aqui você buscaria o cliente real do backend. Exemplo mock:
      const clienteMock: Cliente = {
        id: Number(localStorage.getItem('clienteId')),
        endereco: {
          cep: '80530-022',
          bairro: 'São Francisco',
          cidade: 'Curitiba',
          estado: 'PR',
          numero: '111',
          logradouro: 'Rua Senador Xavier da Silva',
          complemento: '',
          ponto_referencia: ''
        }
      };
      setCliente(clienteMock);
      setEnderecoRegistrado(formatarEndereco(clienteMock.endereco));
      if (localizacaoEscolhida === 'cadastrada') {
        // Buscar geolocalização do endereço cadastrado
        const geo = await buscarGeolocalizacaoEndereco(clienteMock.endereco);
        setChamado({
          cliente_id: clienteMock.id,
          localizacao: geo ? `${geo.latitude},${geo.longitude}` : '',
          endereco_textual: geo ? geo.enderecoFormatado : formatarEndereco(clienteMock.endereco),
          status: 'Pendente'
        });
      }
    };
    if (open) {
      buscarEnderecoCliente();
    }
  }, [open, localizacaoEscolhida]);

  // Efeito para inicializar a localização atual
  useEffect(() => {
    if (open && localizacaoEscolhida === 'atual') {
      obterLocalizacaoAtual();
    }
  }, [open, localizacaoEscolhida]);

  const handleLocalizacaoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const valor = event.target.value as 'atual' | 'cadastrada';
    setLocalizacaoEscolhida(valor);
    setMostrarMapa(valor === 'atual');
    if (valor === 'atual') {
      await obterLocalizacaoAtual();
    } else if (valor === 'cadastrada' && cliente) {
      // Buscar geolocalização do endereço cadastrado
      const geo = await buscarGeolocalizacaoEndereco(cliente.endereco);
      setChamado(prev => ({
        ...prev,
        cliente_id: cliente.id,
        localizacao: geo ? `${geo.latitude},${geo.longitude}` : '',
        endereco_textual: geo ? geo.enderecoFormatado : formatarEndereco(cliente.endereco),
        status: 'Pendente'
      }));
    }
  };

  const obterLocalizacaoAtual = async () => {
        if (navigator.geolocation) {
          try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { 
            enableHighAccuracy: true, 
            timeout: 5000 
          });
        });
        
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        const localizacao = `${latitude},${longitude}`;
        const endereco = await tentarBuscarEndereco(latitude, longitude);
        
        if (endereco) {
          setChamado({
            cliente_id: Number(localStorage.getItem('clienteId')),
            localizacao,
            endereco_textual: endereco,
            status: 'Pendente'
          });
        }
      } catch (error) {
        alert('Erro ao obter localização atual. Por favor, permita o acesso à sua localização.');
      }
    }
  };

  const tentarBuscarEndereco = async (lat: number, lon: number, tentativas = 5, delayMs = 1500) => {
    for (let i = 0; i < tentativas; i++) {
      try {
        const endereco = await getAddressFromCoords(lat, lon);
        if (endereco && endereco.trim() !== '') return endereco;
        console.log(`Tentativa ${i + 1}: Endereço vazio, tentando novamente...`);
      } catch (e) {
        console.warn(`Tentativa ${i + 1} falhou:`, e);
      }
      if (i < tentativas - 1) {
        await new Promise(res => setTimeout(res, delayMs));
      }
    }
    return null;
  };

  const handleFazerAtendimento = async () => {
    if (!chamado) return;
    
    setLoading(true);
      const url = process.env.REACT_APP_SUPABASE_URL;
      const serviceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY;
    
    if (!url || !serviceKey) {
      console.error('Supabase URL ou Service Key não definidos nas variáveis de ambiente.');
      setLoading(false);
      return;
    }

    const headers: HeadersInit = {
          'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
    };

    try {
      const response = await fetch(`${url}/rest/v1/chamado`, {
        method: 'POST',
        headers,
        body: JSON.stringify(chamado)
      });

      if (!response.ok) {
        throw new Error('Erro ao criar chamado');
      }

      // Obter o id do chamado criado
      const locationHeader = response.headers.get('Location');
      let chamadoId = null;
      if (locationHeader) {
        const match = locationHeader.match(/id=eq\.(\d+)/);
        if (match) {
          chamadoId = Number(match[1]);
        }
      }

      // Se não conseguir pelo header, buscar o último chamado do cliente
      if (!chamadoId) {
        const res = await fetch(
          `${url}/rest/v1/chamado?select=id&cliente_id=eq.${chamado.cliente_id}&order=id.desc&limit=1`, 
          { headers }
        );
        const data = await res.json();
        chamadoId = data && data[0] && data[0].id ? data[0].id : null;
      }

      // Armazenar o ID do chamado no localStorage
      if (chamadoId) {
        localStorage.setItem('chamadoId', chamadoId.toString());
        
        // Criar log_chamado
        const logData = {
          chamado_id: chamadoId,
          cliente_id: chamado.cliente_id,
          localizacao: chamado.localizacao,
          endereco_textual: chamado.endereco_textual,
          status: 'Pendente',
          data_abertura: new Date(new Date().getTime() - (3 * 60 * 60 * 1000)).toISOString()
        };

        await fetch(`${url}/rest/v1/log_chamado`, {
          method: 'POST',
          headers,
          body: JSON.stringify(logData)
        });

        navigate('/emergency');
      }
    } catch (error) {
      console.error('Erro ao criar chamado:', error);
      alert('Erro ao criar chamado. Por favor, tente novamente.');
    } finally {
      setLoading(false);
      onClose();
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth={false}
      PaperProps={{
        sx: {
          width: '100%',
          maxWidth: '600px !important',
          maxHeight: '100vh',
          overflow: 'hidden',
        }
      }}
    >
      <DialogTitle>Localização do Atendimento</DialogTitle>
      <DialogContent sx={{ p: 2, pb: 0, position: 'relative', overflow: 'hidden' }}>
        <Box
          component="img"
          src={require('../../assets/Design sem nome (7).png')}
          alt="Marca d'água Support Life"
          sx={{
            position: 'absolute',
            top: '-120px',
            left: '50%',
            width: '100%',
            height: '360px',
            objectFit: 'contain',
            opacity: 0.07,
            pointerEvents: 'none',
            zIndex: 0,
            transform: 'translateX(-50%)',
          }}
        />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, position: 'relative', zIndex: 1, mt: 0 }}>
          <FormControl component="fieldset">
            <RadioGroup
              value={localizacaoEscolhida}
              onChange={handleLocalizacaoChange}
            >
              <Box sx={{ mb: 1 }}>
                <FormControlLabel 
                  value="atual" 
                  control={<Radio />} 
                  label={
                    <Typography sx={{ color: 'text.primary', fontSize: 15 }}>
                      Usar minha localização atual
                </Typography>
                  }
                />
              </Box>
              <Box>
                <FormControlLabel 
                  value="cadastrada" 
                  control={<Radio />} 
                  label={
                    <Typography sx={{ color: 'text.primary', fontSize: 15 }}>
                      Usar endereço cadastrado
                    </Typography>
                  }
                />
              </Box>
            </RadioGroup>
          </FormControl>

          {chamado?.localizacao && localizacaoEscolhida === 'atual' && (
            <Box sx={{ mt: 2 }}>
                <MapPatner
                  center={{
                    lat: Number(chamado.localizacao.split(',')[0]),
                    lng: Number(chamado.localizacao.split(',')[1])
                  }}
                  zoom={15}
                  markers={[
                    {
                      position: {
                        lat: Number(chamado.localizacao.split(',')[0]),
                        lng: Number(chamado.localizacao.split(',')[1])
                      },
                      title: 'Local do chamado'
                    }
                  ]}
              />
            </Box>
          )}
          {((localizacaoEscolhida === 'atual' && chamado?.endereco_textual) || 
            (localizacaoEscolhida === 'cadastrada' && enderecoRegistrado)) && (
            <Typography 
              sx={{ 
                fontSize: 15, 
                color: 'text.secondary'
              }}
            >
              <strong>Endereço:</strong> {localizacaoEscolhida === 'cadastrada' ? enderecoRegistrado : chamado?.endereco_textual}
            </Typography>
          )}
          </Box>
      </DialogContent>
      <DialogActions sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        gap: 2,
        width: '100%',
        justifyContent: 'space-between',
        pb: 2,
        pt: 3,
        px: 3
      }}>
        <Button
          variant="contained"
          color="primary"
          sx={{ minWidth: 120, fontWeight: 600 }}
          fullWidth
          onClick={handleFazerAtendimento}
          disabled={loading || !chamado || (localizacaoEscolhida === 'cadastrada' && !enderecoRegistrado)}
        >
          {loading ? (
            <>
              <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
              Processando...
            </>
          ) : (
            'Continuar'
          )}
        </Button>
        <Button
          variant="outlined"
          color="error"
          sx={{ minWidth: 120, fontWeight: 600 }}
          fullWidth
          onClick={onClose}
          disabled={loading}
        >
          Fechar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ChamadoModalClient; 
