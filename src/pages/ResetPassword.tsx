import React, { useState, useEffect } from 'react';
import { TextField, Button, Container, Typography, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { resetPassword, fetchAuthUserByToken, addUser } from '../Supabase/supabaseClient';

const ResetPassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [userToken, setUserToken] = useState('');
  const navigate = useNavigate();

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
        alert('Senha redefinida com sucesso!');
        navigate('/');
    } catch (error) {
      console.error('Erro ao redefinir senha:', error);
      alert('Erro ao redefinir senha. Por favor, tente novamente.');
    }
  };

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