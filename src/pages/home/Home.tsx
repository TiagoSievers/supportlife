import React from 'react';
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

const Home: React.FC = () => {
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
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <MenuButton
          to="/profile"
          label="Meu Perfil"
          icon={<ProfileIcon />}
        />
        <MenuButton
          to="/family"
          label="Familiares"
          icon={<FamilyIcon />}
        />
        <MenuButton
          to="/admin"
          label="Painel Administrativo"
          icon={<AdminIcon />}
        />
      </Box>
    </Container>
  );
};

export default Home; 