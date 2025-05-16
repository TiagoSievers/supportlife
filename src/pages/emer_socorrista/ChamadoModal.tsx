import React, { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box } from '@mui/material';
import { Chamado } from './chamadoSocorristaList';
import MapPatner from './MapPatner';
import { getAddressFromCoords } from './getAddressFromCoordsSocorrista';
import { useNavigate } from 'react-router-dom';

interface ChamadoModalProps {
  open: boolean;
  chamado: Chamado | null;
  onClose: () => void;
  onFazerAtendimento: () => void;
}

const ChamadoModal: React.FC<ChamadoModalProps> = ({ open, chamado, onClose, onFazerAtendimento }) => {
  const [endereco, setEndereco] = React.useState<string | null>(null);
  const [distancia, setDistancia] = React.useState<string>('');
  const [estimativaTempo, setEstimativaTempo] = React.useState<string>('');
  const [nomeCliente, setNomeCliente] = useState<string>('');
  const navigate = useNavigate();

  // Mock da localização atual do socorrista
  const socorristaCoords = { lat: -25.4284, lng: -49.2733 };

  React.useEffect(() => {
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

  // Simulação de busca do nome do cliente
  useEffect(() => {
    if (chamado && chamado.cliente_id) {
      // Aqui você pode fazer uma busca real pelo nome do cliente
      // Exemplo mock:
      setNomeCliente('Nome do Cliente');
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

  const handleFazerAtendimento = async () => {
    if (!chamado) return;
    try {
      const url = process.env.REACT_APP_SUPABASE_URL;
      const serviceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY;
      const socorristaId = localStorage.getItem('socorristaId');
      if (!url || !serviceKey) throw new Error('Supabase URL ou Service Key não definidos');
      if (!socorristaId) throw new Error('ID do socorrista não encontrado no localStorage');
      const response = await fetch(`${url}/rest/v1/chamado?id=eq.${chamado.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ status: 'A caminho', socorrista_id: socorristaId })
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error_description || data.message || `Erro ${response.status}`);
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
                  {distancia}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0 }}>
                  Distância
                </Typography>
              </Box>
              <Box sx={{ flex: 1, textAlign: 'right' }}>
                <Typography variant="h6" color="primary" sx={{ fontWeight: 700, mb: 0 }}>
                  {estimativaTempo}
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
                <Typography sx={{ fontSize: 15, color: 'text.secondary', mb: 3, mt: 3 }}>
                  <strong>Endereço:</strong> {endereco || chamado.localizacao}
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