import React from 'react';
import { Button, Box, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';

const StyledSOSButton = styled(Button)(({ theme }) => ({
  width: '200px',
  height: '200px',
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
  '&:hover': {
    backgroundColor: '#d32f2f',
    transform: 'scale(1.05)',
    boxShadow: '0 6px 25px rgba(244, 67, 54, 0.35)',
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
    try {
      const getPosition = () => new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });
      const position = await getPosition();
      const { latitude, longitude } = position.coords;
      // Opcional: fazer reverse geocoding para obter endereço textual
      localizacao = `${latitude},${longitude}`;
    } catch (geoError) {
      console.warn('Não foi possível obter a localização do usuário:', geoError);
      localizacao = '';
    }

    const chamadoData = {
      cliente_id: Number(cliente_id),
      localizacao,
      status: 'Pendente'
    };

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