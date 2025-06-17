import React, { useState } from 'react';
import { TextField, Button, Container, Typography, Box, useTheme, useMediaQuery } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const ResetPassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      alert('As senhas não coincidem.');
      return;
    }

    const tokenData = localStorage.getItem('sb-usqozshucjsgmfgaoiad-auth-token');

    if (!tokenData) {
      alert('Token de autorização não encontrado. Por favor, tente recarregar a página a partir do link em seu e-mail.');
      return;
    }

    try {
      const parsed = JSON.parse(tokenData);
      console.log('Objeto "parsed" do localStorage:', parsed);

      if (!parsed.access_token) {
        alert('Formato de token inválido ou token de acesso não encontrado no JSON.');
        return;
      }

      const url = process.env.REACT_APP_SUPABASE_URL;
      const serviceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY;

      if (!url || !serviceKey) {
        throw new Error('Variáveis de ambiente do Supabase não definidas.');
      }

      const response = await fetch(`${url}/auth/v1/user`, {
        method: 'PUT',
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${parsed.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          password: password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error_description || data.message || `Erro ${response.status}`);
      }
      
      if (isMobile) {
        setShowSuccess(true);
      } else {
        alert('Senha redefinida com sucesso!');
        navigate('/');
      }
    } catch (error) {
      console.error('Erro ao redefinir senha:', error);
      alert(`Erro ao redefinir senha. Por favor, tente novamente. Detalhes: ${error instanceof Error ? error.message : String(error)}`);
    }
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