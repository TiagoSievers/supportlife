import React, { useEffect, useState } from 'react';
import { Box, Typography, Container, useTheme, useMediaQuery } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../Supabase/supabaseRealtimeClient';
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

interface FamilyEmergenciesProps {
  onNewChamado?: (hasNew: boolean) => void;
}

const FamilyEmergencies: React.FC<FamilyEmergenciesProps> = ({ onNewChamado }) => {
  const [hasNewChamado, setHasNewChamado] = useState(false);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Mantém apenas a lógica de realtime/notificação, não a lista
  useEffect(() => {
    const channel = supabase
      .channel('public:chamado-family-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chamado' }, async (payload: any) => {
        const familiarId = localStorage.getItem('familiarId') || localStorage.getItem('userId');
        if (!familiarId) return;
        if (payload.new && Array.isArray(payload.new.notificacao_familiares)) {
          const notificacoes = payload.new.notificacao_familiares;
          const familiarNotificado = notificacoes.some((notif: any) => notif.id === familiarId);
          if (familiarNotificado && payload.new.status !== 'concluído') {
            setHasNewChamado(true);
            if (onNewChamado) onNewChamado(true);
          }
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [onNewChamado]);

  // Renderiza apenas o NotificaoList
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
