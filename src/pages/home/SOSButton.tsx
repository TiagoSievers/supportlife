import React from 'react';
import { Button, Box, Typography } from '@mui/material';
import { styled, keyframes } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { getAddressFromCoords } from './getAddressFromCoords';

// Adicionar animação de sombra suave
const shadowGlow = keyframes`
  0% {
    box-shadow: 0 4px 20px rgba(244, 67, 54, 0.45);
  }
  50% {
    box-shadow: 0 0 50px 18px rgba(244, 67, 54, 0.65);
  }
  100% {
    box-shadow: 0 4px 20px rgba(244, 67, 54, 0.45);
  }
`;

const StyledSOSButton = styled(Button)(({ theme }) => ({
  width: '260px',
  height: '260px',
  backgroundColor: '#f44336',
  color: '#fff',
  borderRadius: '50%',
  fontSize: '2.5rem',
  fontWeight: 'bold',
  textTransform: 'none',
  boxShadow: '0 4px 20px rgba(244, 67, 54, 0.25)',
  transition: 'all 0.3s ease',
  position: 'relative',
  overflow: 'hidden',
  animation: `${shadowGlow} 2s infinite`,
  '&:hover': {
    backgroundColor: '#d32f2f',
    transform: 'scale(1.05)',
    boxShadow: '0 6px 25px rgba(244, 67, 54, 0.35)',
    animation: 'none',
  },
  '&:active': {
    transform: 'scale(0.95)',
    boxShadow: '0 2px 15px rgba(244, 67, 54, 0.25)',
  },
  '&::before': {
    content: '""',
    position: 'absolute',
    top: '-50%',
    left: '-50%',
    width: '200%',
    height: '200%',
    background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%)',
    transform: 'scale(0)',
    transition: 'transform 0.5s ease-out',
  },
  '&:hover::before': {
    transform: 'scale(1)',
  }
}));

const SOSButton: React.FC = () => {
  const navigate = useNavigate();

  const handleSOSClick = async () => {
    const url = process.env.REACT_APP_SUPABASE_URL;
    const serviceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY;
    if (!url || !serviceKey) {
      console.error('Supabase URL ou Service Key não definidos nas variáveis de ambiente.');
      return;
    }
    const cliente_id = localStorage.getItem('clienteId');
    console.log('clienteId do localStorage:', cliente_id);
    if (!cliente_id) {
      console.error('ID do cliente não encontrado no localStorage. Usuário não está logado como cliente?');
      return;
    }

    // Obter localização do usuário
    let localizacao = '';
    let endereco_textual: string | null = '';
    let latitude = null;
    let longitude = null;
    try {
      const getPosition = () => new Promise<GeolocationPosition>((resolve, reject) => {
        const options = {
          enableHighAccuracy: true,  // Solicita a melhor precisão possível
          timeout: 10000,           // Tempo limite de 10 segundos
          maximumAge: 0             // Não usar posições em cache
        };
        navigator.geolocation.getCurrentPosition(resolve, reject, options);
      });
      const position = await getPosition();
      latitude = position.coords.latitude;
      longitude = position.coords.longitude;
      localizacao = `${latitude},${longitude}`;
      console.log('Coordenadas obtidas:', latitude, longitude);
    } catch (geoError) {
      console.warn('Não foi possível obter a localização do usuário:', geoError);
      // Mensagens de erro amigáveis
      if (geoError && typeof geoError === 'object' && 'code' in geoError) {
        switch (geoError.code) {
          case 1: // PERMISSION_DENIED
            alert('Por favor, permita o acesso à sua localização para continuar.');
            break;
          case 2: // POSITION_UNAVAILABLE
            alert('Informações de localização indisponíveis. Por favor, verifique suas configurações de localização.');
            break;
          case 3: // TIMEOUT
            alert('Tempo esgotado ao obter localização. Por favor, tente novamente.');
            break;
          default:
            alert('Não foi possível obter sua localização.');
        }
      } else {
        alert('Não foi possível obter sua localização.');
      }
      localizacao = '';
      endereco_textual = '';
      return; // Sai da função se não conseguir obter a localização
    }

    // Tentar buscar o endereço até conseguir ou atingir o limite de tentativas
    async function tentarBuscarEndereco(lat: number, lon: number, tentativas = 5, delayMs = 1500) {
      for (let i = 0; i < tentativas; i++) {
        try {
          const endereco = await getAddressFromCoords(lat, lon);
          if (endereco && endereco.trim() !== '') return endereco;
          console.log(`Tentativa ${i + 1}: Endereço vazio, tentando novamente...`);
        } catch (e) {
          console.warn(`Tentativa ${i + 1} falhou:`, e);
        }
        if (i < tentativas - 1) { // Não espera na última tentativa
        await new Promise(res => setTimeout(res, delayMs));
        }
      }
      return null; // Retorna null em vez de string vazia para indicar falha
    }

    if (latitude && longitude) {
      endereco_textual = await tentarBuscarEndereco(latitude, longitude);
      if (!endereco_textual) {
        alert('Não foi possível obter o endereço completo. Por favor, tente novamente ou entre em contato com o suporte.');
        return;
      }
    } else {
      alert('É necessário permitir o acesso à localização para continuar.');
      return;
    }
    console.log('Endereço textual obtido:', endereco_textual);

    const chamadoData = {
      cliente_id: Number(cliente_id),
      localizacao,
      endereco_textual,
      status: 'Pendente'
    };

    // Validação final antes de enviar
    if (!endereco_textual || endereco_textual.trim() === '') {
      console.error('Tentando enviar chamado sem endereço textual');
      alert('Erro ao obter o endereço. Por favor, tente novamente.');
      return;
    }

    console.log('Enviando chamado (curl style):', chamadoData);

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
        body: JSON.stringify(chamadoData)
      });
      if (!response.ok) {
        throw new Error('Erro ao criar chamado');
      }
      // Obter o id do chamado criado
      const locationHeader = response.headers.get('Location');
      let chamadoId = null;
      if (locationHeader) {
        // Exemplo: /rest/v1/chamado?id=eq.42
        const match = locationHeader.match(/id=eq\\.(\\d+)/);
        if (match) {
          chamadoId = Number(match[1]);
        }
      }
      // Se não conseguir pelo header, buscar o último chamado do cliente
      if (!chamadoId) {
        const res = await fetch(`${url}/rest/v1/chamado?select=id&cliente_id=eq.${cliente_id}&order=id.desc&limit=1`, { headers });
        const data = await res.json();
        chamadoId = data && data[0] && data[0].id ? data[0].id : null;
      }

      // Armazenar o ID do chamado no localStorage
      if (chamadoId) {
        localStorage.setItem('chamadoId', chamadoId.toString());
        console.log('ID do chamado armazenado no localStorage:', chamadoId);
      }

      // Criar log_chamado
      if (chamadoId) {
        const logData = {
          chamado_id: chamadoId,
          cliente_id: Number(cliente_id),
          localizacao,
          endereco_textual,
          status: 'Pendente',
          data_abertura: new Date().toISOString()
        };
        await fetch(`${url}/rest/v1/log_chamado`, {
          method: 'POST',
          headers,
          body: JSON.stringify(logData)
        });
      }
      console.log('Chamado criado com sucesso!');
      navigate('/emergency');
    } catch (error) {
      console.error('Erro ao criar chamado:', error);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        my: 4
      }}
    >
      <StyledSOSButton
        onClick={handleSOSClick}
        aria-label="Botão de emergência SOS"
      >
        SOS
      </StyledSOSButton>
      <Typography
        variant="body2"
        color="text.secondary"
        align="center"
        sx={{ maxWidth: '280px' }}
      >
        Clique em caso de emergência para solicitar atendimento imediato
      </Typography>
    </Box>
  );
};

export default SOSButton; 
