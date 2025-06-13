import React, { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box } from '@mui/material';
import { Chamado } from './chamadoSocorristaList';
import MapPatner from './MapPatner';
// Removido import getAddressFromCoords - usando endereco_textual do banco
import { useNavigate } from 'react-router-dom';

interface ChamadoModalProps {
  open: boolean;
  chamado: Chamado | null;
  onClose: () => void;
  onFazerAtendimento: () => void;
}

const ChamadoModal: React.FC<ChamadoModalProps> = ({ open, chamado, onClose, onFazerAtendimento }) => {
  const [distancia, setDistancia] = React.useState<string>('');
  const [estimativaTempo, setEstimativaTempo] = React.useState<string>('');
  const [nomeCliente, setNomeCliente] = useState<string>('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [routeCoords, setRouteCoords] = useState<{ lat: number; lng: number }[]>([]);
  const [routeDuration, setRouteDuration] = useState<number | null>(null);
  const navigate = useNavigate();

  // Endereço agora vem diretamente do campo endereco_textual do banco
  React.useEffect(() => {
    if (chamado) {
      setDistancia('');
      setEstimativaTempo('');
    }
  }, [chamado]);

  useEffect(() => {
    setNomeCliente('');
  }, [chamado]);

  React.useEffect(() => {
    let ignore = false;
    async function calcularDistanciaTempo() {
      if (chamado && chamado.localizacao) {
        const [lat, lon] = chamado.localizacao.split(',').map(Number);
        let userLat: number | null = null;
        let userLon: number | null = null;
        if (navigator.geolocation) {
          try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 5000 });
            });
            userLat = position.coords.latitude;
            userLon = position.coords.longitude;
          } catch (geoErr) {
            // Se der erro, deixa null
          }
        }
        if (userLat !== null && userLon !== null) {
          // Cálculo de distância
          const R = 6371; // km
          const dLat = (lat - userLat) * Math.PI / 180;
          const dLon = (lon - userLon) * Math.PI / 180;
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(userLat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const distanciaKm = R * c;
          if (!ignore) {
            setDistancia(`${distanciaKm.toFixed(2)} km`);
            // Tempo estimado agora vem da rota real
            setEstimativaTempo(routeDuration !== null ? `${routeDuration} min` : '--');
          }
        } else {
          if (!ignore) {
            setDistancia('--');
            setEstimativaTempo('--');
          }
        }
      } else {
        if (!ignore) {
          setDistancia('--');
          setEstimativaTempo('--');
        }
      }
    }
    calcularDistanciaTempo();
    return () => { ignore = true; };
  }, [chamado, routeDuration]);

  useEffect(() => {
    if (open) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
          },
          () => setUserLocation(null),
          { enableHighAccuracy: true, timeout: 5000 }
        );
      } else {
        setUserLocation(null);
      }
    }
  }, [open]);

  useEffect(() => {
    const fetchRoute = async () => {
      if (userLocation && chamado && chamado.localizacao) {
        const [lat, lon] = chamado.localizacao.split(',').map(Number);
        const url = `https://router.project-osrm.org/route/v1/driving/${userLocation.lng},${userLocation.lat};${lon},${lat}?overview=full&geometries=geojson`;
        try {
          const response = await fetch(url);
          const data = await response.json();
          if (data.routes && data.routes[0]) {
            setRouteCoords(data.routes[0].geometry.coordinates.map(([lng, lat]: [number, number]) => ({ lat, lng })));
            // Salvar duração em minutos
            setRouteDuration(Math.ceil(data.routes[0].duration / 60));
          } else {
            setRouteCoords([]);
            setRouteDuration(null);
          }
        } catch {
          setRouteCoords([]);
          setRouteDuration(null);
        }
      } else {
        setRouteCoords([]);
        setRouteDuration(null);
      }
    };
    fetchRoute();
  }, [userLocation, chamado]);

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

  const handleFazerAtendimento = async () => {
    if (!chamado) return;
    try {
      const url = process.env.REACT_APP_SUPABASE_URL;
      const serviceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY;
      const accessToken = localStorage.getItem('accessToken');
      if (!url || !serviceKey) throw new Error('Supabase URL ou Service Key não definidos');
      if (!accessToken) throw new Error('Token de acesso não encontrado no localStorage');

      let posicao = '';
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 5000 });
          });
          posicao = `${position.coords.latitude},${position.coords.longitude}`;
        } catch (geoErr) {
          // Se der erro, mantém vazio
        }
      }

      const payload = { 
        status: 'A caminho', 
        socorrista_id: localStorage.getItem('socorristaId'),
        posicao_inicial_socorrista: posicao
      };
      console.log('[ChamadoModal] Enviando PATCH para /chamado:', payload);
      const response = await fetch(`${url}/rest/v1/chamado?id=eq.${chamado.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error_description || data.message || `Erro ${response.status}`);
      }
      // Criar log_chamado após aceitar
      const chamadoResp = await fetch(`${url}/rest/v1/chamado?id=eq.${chamado.id}`, {
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      const chamadoData = await chamadoResp.json();
      if (chamadoData && chamadoData[0]) {
        const logData = {
          chamado_id: chamadoData[0].id,
          cliente_id: chamadoData[0].cliente_id,
          localizacao: chamadoData[0].localizacao,
          endereco_textual: chamadoData[0].endereco_textual,
          status: chamadoData[0].status,
          operador_id: chamadoData[0].operador_id,
          socorrista_id: chamadoData[0].socorrista_id,
          data_abertura: chamadoData[0].data_abertura,
          data_fechamento: chamadoData[0].data_fechamento,
          descricao: chamadoData[0].descricao,
          prioridade: chamadoData[0].prioridade,
          notificacao_familiares: chamadoData[0].notificacao_familiares,
          posicao_inicial_socorrista: chamadoData[0].posicao_inicial_socorrista
        };
        await fetch(`${url}/rest/v1/log_chamado`, {
          method: 'POST',
          headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(logData)
        });
      }
      // Salva o id do chamado no localStorage
      localStorage.setItem('chamadoId', chamado.id);
      onFazerAtendimento();
      navigate('/emergencia-socorrista');
    } catch (err) {
      alert('Erro ao atualizar status para A caminho.');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Detalhes do Chamado</DialogTitle>
      <DialogContent sx={{ p: 2, pb: 0, position: 'relative' }}>
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
        {/* Conteúdo principal */}
        {chamado && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, position: 'relative', zIndex: 1, mt: 0 }}>
            <Typography sx={{ mt: 0, mb: 0 }}><strong>Nº Chamado:</strong> {chamado.id}</Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, mt: 0.25, mb: 0.25 }}>
              <Box sx={{ flex: 1, textAlign: 'left' }}>
                <Typography variant="h6" color="primary" sx={{ fontWeight: 700, mb: 0 }}>
                  {distancia || '--'}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0 }}>
                  Distância
                </Typography>
              </Box>
              <Box sx={{ flex: 1, textAlign: 'right' }}>
                <Typography variant="h6" color="primary" sx={{ fontWeight: 700, mb: 0 }}>
                  {estimativaTempo || '--'}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0 }}>
                  Tempo estimado
                </Typography>
              </Box>
            </Box>
            {chamado.localizacao && (
              <Box sx={{ mt: 0.25 }}>

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
                  routeCoords={routeCoords}
                  ambulancePosition={userLocation || undefined}
                />
                <Typography sx={{ fontSize: 15, color: 'text.secondary', mb: 3, mt: 3 }}>
                  <strong>Endereço:</strong> {chamado.endereco_textual || chamado.localizacao}
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        gap: 2,
        width: '100%',
        justifyContent: 'space-between',
        pb: 2,
        pt: 0,
        px: 3
      }}>
        <Button
          variant="contained"
          color="primary"
          sx={{ minWidth: 120, fontWeight: 600 }}
          fullWidth
          onClick={handleFazerAtendimento}
        >
          Fazer Atendimento
        </Button>
        <Button
          variant="outlined"
          color="error"
          sx={{ minWidth: 120, fontWeight: 600 }}
          fullWidth
          onClick={onClose}
        >
          Fechar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ChamadoModal; 