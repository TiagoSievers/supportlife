import React, { useState, useEffect } from 'react';
import { TextField, Button, Container, Typography, Box, useTheme, useMediaQuery } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { resetPassword, fetchAuthUserByToken, addUser } from '../Supabase/supabaseClient';

const ResetPassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [userToken, setUserToken] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.substring(1));
    const token = params.get('access_token');
    if (token) {
      console.log('Token de acesso extraído:', token);
      setUserToken(token);
    } else {
      console.log('Token de acesso não encontrado na URL.');
    }
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      alert('As senhas não coincidem.');
      return;
    }
    try {
        await resetPassword(password, userToken);
        
        if (isMobile) {
          setShowSuccess(true);
        } else {
          alert('Senha redefinida com sucesso!');
          navigate('/');
        }
    } catch (error) {
      console.error('Erro ao redefinir senha:', error);
      alert('Erro ao redefinir senha. Por favor, tente novamente.');
    }
  };

  const handleOpenApp = () => {
    window.location.href = 'supportlife://login';
  };

  if (showSuccess && isMobile) {
    return (
      <Container maxWidth="sm" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', textAlign: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom color="primary">
          ✅ Sucesso!
        </Typography>
        <Typography variant="h6" component="h2" gutterBottom sx={{ mb: 3 }}>
          Sua senha foi redefinida com sucesso!
        </Typography>
        <Typography variant="body1" sx={{ mb: 4, color: 'text.secondary' }}>
          Agora você pode fazer login no aplicativo com sua nova senha.
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          size="large"
          onClick={handleOpenApp}
          sx={{ 
            py: 1.5, 
            px: 4,
            fontSize: '1.1rem',
            borderRadius: 2
          }}
        >
          Abrir Aplicativo
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', minHeight: '100vh', pt: 4 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        Redefinir Senha
      </Typography>
      <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%', mt: 2 }}>
        <TextField
          label="Nova Senha"
          type="password"
          fullWidth
          margin="dense"
          variant="outlined"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <TextField
          label="Confirmar Nova Senha"
          type="password"
          fullWidth
          margin="dense"
          variant="outlined"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 2 }}>
          Redefinir Senha
        </Button>
      </Box>
    </Container>
  );
};

export default ResetPassword; 