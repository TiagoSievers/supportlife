import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, CircularProgress, Button } from '@mui/material';
import MapPatnerEme from './MapPatnerEme';
import Cronometro from './CronometroSocorrista';
import { getAddressFromCoords } from './getAddressFromCoordsSocorrista';
import { useNavigate } from 'react-router-dom';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';

interface Chamado {
  id: string;
  cliente_id: string;
  status: string;
  data_abertura: string;
  localizacao: string;
}

const socorristaCoords = { lat: -25.4284, lng: -49.2733 };

const EmergencySocorrista: React.FC = () => {
  const [chamado, setChamado] = useState<Chamado | null>(null);
  const [endereco, setEndereco] = useState<string | null>(null);
  const [distancia, setDistancia] = useState<string>('');
  const [estimativaTempo, setEstimativaTempo] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Simulação de fetch do chamado (mock)
    // Substitua por fetch real se necessário
    const chamadoMock: Chamado = {
      id: '123',
      cliente_id: '456',
      status: 'Aceito / Em andamento',
      data_abertura: new Date().toISOString(),
      localizacao: '-25.4411,-49.2769',
    };
    setChamado(chamadoMock);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (chamado && chamado.localizacao) {
      const [lat, lon] = chamado.localizacao.split(',').map(Number);
      getAddressFromCoords(lat, lon).then(setEndereco);
      // Mock de cálculo de distância e tempo
      const distanciaKm = calcularDistancia(socorristaCoords.lat, socorristaCoords.lng, lat, lon);
      setDistancia(`${distanciaKm.toFixed(2)} km`);
      // Supondo média de 40km/h
      const tempoMin = Math.ceil((distanciaKm / 40) * 60);
      setEstimativaTempo(`${tempoMin} min`);
    }
  }, [chamado]);

  function calcularDistancia(lat1: number, lon1: number, lat2: number, lon2: number) {
    // Fórmula de Haversine
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  function formatarDataHora(data: string) {
    if (!data) return '';
    const d = new Date(data);
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const ano = d.getFullYear();
    const hora = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dia}/${mes}/${ano} ${hora}:${min}`;
  }

  // Função para finalizar atendimento
  const finalizarAtendimento = async () => {
    // Aqui você pode fazer o PATCH real se quiser
    // Exemplo de mock:
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigate('/partner-emergencies');
    }, 1000);
  };

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      gap: 3,
      maxWidth: 800,
      mx: 'auto',
      minHeight: 'calc(100vh - 64px)',
      position: 'relative',
      overflow: 'hidden',
      pb: 2,
      mt: 3
    }}>
      {/* Mapa ocupa todo o espaço até o Paper */}
      {/* chamado ? (
        <Box sx={{ mb: 3, minHeight: 250 }}>
          <MapPatner
            center={{
              lat: Number(chamado.localizacao.split(',')[0]),
              lng: Number(chamado.localizacao.split(',')[1])
            }}
            zoom={15}
            markers={[{
              position: {
                lat: Number(chamado.localizacao.split(',')[0]),
                lng: Number(chamado.localizacao.split(',')[1])
              },
              title: 'Local do chamado'
            }, {
              position: socorristaCoords,
              title: 'Sua localização'
            }]}
          />
        </Box>
      ) : (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3, mb: 3, minHeight: 250 }}>
          <CircularProgress />
        </Box>
      ) */}
      {/* Paper de Informações do Chamado */}
      <Paper elevation={0} sx={{
        borderRadius: 2,
        backgroundColor: 'transparent',
        boxShadow: 'none',
        border: 'none',
        maxWidth: 800,
        mx: 'auto',
        mb: 2,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        p: { xs: 2, sm: 3 },
        position: 'relative',
      }}>
        {/* Marca d'água */}
        <Box
          component="img"
          src={require('../../assets/Design sem nome (7).png')}
          alt="Marca d'água Support Life"
          sx={{
            position: 'absolute',
            top: '55%',
            left: 0,
            width: '100%',
            height: '60%',
            objectFit: 'contain',
            opacity: 0.07,
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
        <Typography variant="h6" sx={{ mb: 1, position: 'relative', zIndex: 1 }}>Informações do Chamado</Typography>
        {chamado ? (
          <>
            <Box sx={{ width: '100%', minHeight: 350, maxHeight: 500, position: 'relative', zIndex: 1 }}>
              <MapPatnerEme
                center={{
                  lat: Number(chamado.localizacao.split(',')[0]),
                  lng: Number(chamado.localizacao.split(',')[1])
                }}
                zoom={15}
                markers={[{
                  position: {
                    lat: Number(chamado.localizacao.split(',')[0]),
                    lng: Number(chamado.localizacao.split(',')[1])
                  },
                  title: 'Local do chamado'
                }, {
                  position: socorristaCoords,
                  title: 'Sua localização'
                }]}
              />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2, position: 'relative', zIndex: 1 }}>
              {/* Tempo que falta para chegar (esquerda) */}
              <Typography variant="h5" sx={{ fontWeight: 700, minWidth: 90, textAlign: 'left' }}>
                {estimativaTempo || '--'}
              </Typography>
              {/* Hora prevista de chegada (centro) */}
              <Typography variant="body1" sx={{ flex: 1, textAlign: 'center' }}>
                {(() => {
                  // Calcular hora prevista de chegada
                  if (!estimativaTempo) return '--:--';
                  const tempoMin = parseInt(estimativaTempo.replace(/\D/g, '')) || 0;
                  const chegada = new Date();
                  chegada.setMinutes(chegada.getMinutes() + tempoMin);
                  return chegada.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                })()}
              </Typography>
              {/* Distância à direita */}
              <Typography variant="body1" sx={{ minWidth: 90, textAlign: 'right' }}>
                {distancia || '--'}
              </Typography>
            </Box>
            {/* Endereço completo abaixo da linha principal */}
            <Typography variant="body2" sx={{ textAlign: 'left', color: 'text.secondary', mt: 1, position: 'relative', zIndex: 1 }}>
              {endereco || 'Endereço não disponível'}
            </Typography>
            {/* Botões de ação */}
            <Box sx={{ display: 'flex', flexDirection: 'row', gap: 2, mt: 2, width: '100%', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
              <Button
                variant="contained"
                color="primary"
                sx={{ minWidth: 120, fontWeight: 600 }}
                // onClick={chegueiHandler} // Adapte a ação se necessário
              >
                Cheguei
              </Button>
              <Button
                variant="outlined"
                color="error"
                sx={{ minWidth: 120, fontWeight: 600 }}
                onClick={finalizarAtendimento}
              >
                Cancelar
              </Button>
            </Box>
          </>
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default EmergencySocorrista; 