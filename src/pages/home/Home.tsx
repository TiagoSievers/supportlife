import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Box, Typography, Button, Container } from '@mui/material';
import {
  Person as ProfileIcon,
  People as FamilyIcon,
  Dashboard as AdminIcon,
} from '@mui/icons-material';
import SOSButton from './SOSButton';

const MenuButton: React.FC<{
  to: string;
  label: string;
  icon: React.ReactNode;
}> = ({ to, label, icon }) => (
  <Link to={to} style={{ textDecoration: 'none' }}>
    <Button
      variant="outlined"
      fullWidth
      sx={{
        py: 2,
        px: 3,
        justifyContent: 'space-between',
        backgroundColor: 'white',
        borderColor: '#e0e0e0',
        color: 'text.primary',
        '&:hover': {
          backgroundColor: '#f5f5f5',
          borderColor: '#e0e0e0',
          transform: 'translateY(-2px)',
          transition: 'transform 0.2s ease-in-out',
        }
      }}
    >
      <Typography variant="body1">{label}</Typography>
      {icon}
    </Button>
  </Link>
);

const FALLBACK_COORDS = { lat: -23.5505, lng: -46.6333 };

const getLocationByIP = async () => {
  try {
    const response = await fetch('https://get.geojs.io/v1/ip/geo.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    if (!data.latitude || !data.longitude) {
      throw new Error('Invalid IP location data received from GeoJS');
    }
    return {
      lat: parseFloat(data.latitude),
      lng: parseFloat(data.longitude),
      accuracy: 5000,
      source: 'IP'
    };
  } catch (error) {
    console.error('Error getting location by IP (GeoJS):', error);
    return null;
  }
};

const Home: React.FC = () => {
  const [localizacao, setLocalizacao] = useState<string>('');
  const [precisao, setPrecisao] = useState<number | null>(null);
  const [fonte, setFonte] = useState<string>('');
  const [erro, setErro] = useState<string>('');

  useEffect(() => {
    const obterLocalizacao = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            setLocalizacao(`${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`);
            setPrecisao(position.coords.accuracy);
            setFonte('GPS/Navegador');
            setErro('');
          },
          async (error) => {
            let msg = 'Não foi possível obter a localização precisa. ';
            if (error.code === error.PERMISSION_DENIED) {
              msg += 'Permissão negada. ';
            }
            msg += 'Tentando localização aproximada por IP...';
            setErro(msg);
            // Fallback por IP
            const ipLocation = await getLocationByIP();
            if (ipLocation) {
              setLocalizacao(`${ipLocation.lat.toFixed(6)}, ${ipLocation.lng.toFixed(6)}`);
              setPrecisao(ipLocation.accuracy);
              setFonte('IP');
              setErro('Localização aproximada por IP.');
            } else {
              setLocalizacao(`${FALLBACK_COORDS.lat}, ${FALLBACK_COORDS.lng}`);
              setPrecisao(null);
              setFonte('Padrão');
              setErro('Não foi possível obter sua localização. Usando localização padrão (São Paulo).');
            }
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        );
      } else {
        setErro('Seu navegador não suporta geolocalização. Tentando localização aproximada por IP...');
        (async () => {
          const ipLocation = await getLocationByIP();
          if (ipLocation) {
            setLocalizacao(`${ipLocation.lat.toFixed(6)}, ${ipLocation.lng.toFixed(6)}`);
            setPrecisao(ipLocation.accuracy);
            setFonte('IP');
            setErro('Localização aproximada por IP.');
          } else {
            setLocalizacao(`${FALLBACK_COORDS.lat}, ${FALLBACK_COORDS.lng}`);
            setPrecisao(null);
            setFonte('Padrão');
            setErro('Não foi possível obter sua localização. Usando localização padrão (São Paulo).');
          }
        })();
      }
    };
    obterLocalizacao();
  }, []);

  return (
    <Container maxWidth="sm" sx={{ 
      display: 'flex',
      flexDirection: 'column',
      gap: 3,
      position: 'relative',
      overflow: 'hidden',
      p: 0, 
      m: 0, 
      pt: 3,
      minHeight: 'calc(100vh - 64px)',
      mx: 'auto'
    }}>
      {/* Marca d'água */}
      <Box
        component="img"
        src={require('../../assets/Design sem nome (7).png')}
        alt="Marca d'água Support Life"
        sx={{
          position: 'absolute',
          top: '55%',
          left: '50%',
          width: '220%',
          height: '220%',
          objectFit: 'contain',
          opacity: 0.07,
          pointerEvents: 'none',
          zIndex: 0,
          transform: 'translate(-50%, -50%)',
        }}
      />
      {/* Conteúdo principal */}
      <Box sx={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <Typography 
          variant="h4" 
          component="h1" 
          gutterBottom 
          sx={{ fontWeight: 'bold' }}
        >
          Saúde 24 horas
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Pressione o botão SOS para acionar uma ambulância em caso de emergência
        </Typography>
        
        <SOSButton />
        {/* Localização abaixo do botão */}
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Sua localização atual:
          </Typography>
          <Typography variant="body2" color="text.primary" sx={{ fontWeight: 'medium' }}>
            {localizacao}
          </Typography>
          {precisao && (
            <Typography variant="caption" color="text.secondary">
              Precisão: {Math.round(precisao)} metros ({fonte})
            </Typography>
          )}
          {erro && (
            <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
              {erro}
            </Typography>
          )}
        </Box>
      </Box>
    </Container>
  );
};

export default Home; 