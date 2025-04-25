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

  const handleSOSClick = () => {
    navigate('/emergency');
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