import React from 'react';
import { Box, Container } from '@mui/material';
import NotificaoList from './NotificaoList';

// Função utilitária para formatar data/hora
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

// Remover qualquer referência a notificação, estados, efeitos e props relacionados
// Remover: useState, setHasNewChamado, onNewChamado, useEffect de realtime, props, etc.
// O componente deve apenas renderizar o NotificaoList normalmente.
const FamilyEmergencies: React.FC = () => {
  return (
    <Box sx={{
      width: '100vw',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      position: 'relative',
      overflow: 'hidden',
      bgcolor: 'background.default',
    }}>
      {/* Marca d'água */}
      <Box
        component="img"
        src={require('../../assets/Design sem nome (7).png')}
        alt="Marca d'água Support Life"
        sx={{
          position: 'absolute',
          top: '30%',
          left: '50%',
          width: '180%',
          height: '180%',
          objectFit: 'contain',
          opacity: 0.07,
          pointerEvents: 'none',
          zIndex: 0,
          transform: 'translate(-50%, -50%)',
        }}
      />
      <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1, p: 0, pt: 8 }}>
        <NotificaoList />
      </Container>
    </Box>
  );
};

export default FamilyEmergencies; 
