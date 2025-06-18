import React, { useState, useEffect } from 'react';
import { TextField, Button, Container, Typography, Box, useTheme, useMediaQuery } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const ResetPassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Verificar e corrigir a URL se necessário
  useEffect(() => {
    const currentPath = window.location.pathname;
    const currentSearch = window.location.search;
    const currentHash = window.location.hash;
    
    // Verifica se o path termina com 'reset-password' sem a barra inicial
    if (currentPath.endsWith('reset-password') && !currentPath.endsWith('/reset-password')) {
      const correctedPath = currentPath.replace(/reset-password$/, '/reset-password');
      const newUrl = correctedPath + currentSearch + currentHash;
      
      // Substitui a URL atual sem adicionar uma nova entrada no histórico
      window.history.replaceState(null, '', newUrl);
    }
  }, []);

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
        console.error('Resposta de erro da API Supabase:', data);
        throw new Error(data.message || data.error_description || `Erro ${response.status}`);
      }
      
      if (isMobile) {
        setShowSuccess(true);
      } else {
        alert('Senha redefinida com sucesso!');
        navigate('/');
      }
    } catch (error) {
      console.error('Erro ao redefinir senha:', error);

      let userMessage = 'Ocorreu um erro inesperado. Por favor, tente novamente.';

      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        
        if (errorMessage.includes('422') || errorMessage.includes('password should be at least')) {
          userMessage = 'A senha fornecida é muito fraca. Por favor, use uma senha com pelo menos 6 caracteres.';
        } else if (errorMessage.includes('401')) {
          userMessage = 'Seu link de redefinição é inválido ou expirou. Por favor, solicite um novo.';
        } else {
          userMessage = error.message;
        }
      }

      alert(userMessage);
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