import React, { useState, useEffect } from 'react';
import { TextField, Button, Container, Typography, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import { useMediaQuery } from '@mui/material';
import { resetPassword, fetchAuthUserByToken, addUser } from '../Supabase/supabaseClient';

const ResetPassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [userToken, setUserToken] = useState('');
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const navigate = useNavigate();
  
  // Detecção de dispositivo
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Detectar se está rodando no app Capacitor
  const isCapacitorApp = window.location.protocol === 'capacitor:' || 
                         window.location.hostname === 'localhost' ||
                         (window as any).Capacitor;

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    if (accessToken) {
      setUserToken(accessToken);
    }
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      alert('As senhas não coincidem');
      return;
    }

    try {
      await resetPassword(password, userToken);
      
      // ✅ PRESERVA O FLUXO ATUAL - busca dados do usuário
      const userData = await fetchAuthUserByToken(userToken);
      if (userData) {
        await addUser(userData);
      }
      
      // ✅ NOVA FUNCIONALIDADE - detecta ambiente e age adequadamente
      if (isCapacitorApp || isMobile) {
        // Mobile/App: Mostra mensagem de sucesso
        setShowSuccessMessage(true);
      } else {
        // Desktop: Mantém comportamento atual
        alert('Senha redefinida com sucesso!');
        navigate('/');
      }
    } catch (error) {
      console.error('Erro ao redefinir senha:', error);
      alert('Erro ao redefinir senha. Tente novamente.');
    }
  };

  const handleOpenApp = () => {
    // Tenta abrir o app via deep link
    const deepLink = 'supportlife://login';
    window.location.href = deepLink;
    
    // Fallback: após 2 segundos, mostra instruções
    setTimeout(() => {
      alert('Se o app não abriu automaticamente, feche o navegador e abra o app Supportlife manualmente.');
    }, 2000);
  };

  // ✅ NOVA TELA DE SUCESSO (apenas para mobile/app)
  if (showSuccessMessage) {
    return (
      <Container maxWidth="sm" sx={{ mt: 4 }}>
        <Box sx={{ textAlign: 'center', p: 3 }}>
          <Typography variant="h4" gutterBottom color="success.main">
            ✅ Senha Redefinida!
          </Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            Sua senha foi alterada com sucesso.
          </Typography>
          <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
            Agora você pode fazer login no aplicativo com sua nova senha.
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Button 
              variant="contained" 
              color="primary" 
              size="large"
              onClick={handleOpenApp}
              sx={{ py: 1.5 }}
            >
              🚀 Abrir App Supportlife
            </Button>
            
            <Typography variant="caption" color="text.secondary">
              Se o app não abrir automaticamente, feche esta aba e abra o app manualmente
            </Typography>
          </Box>
        </Box>
      </Container>
    );
  }

  // ✅ PRESERVA A TELA ATUAL DE REDEFINIÇÃO
  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Redefinir Senha
      </Typography>
      <form onSubmit={handleSubmit}>
        <TextField
          label="Nova Senha"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          fullWidth
          margin="normal"
          required
        />
        <TextField
          label="Confirmar Nova Senha"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          fullWidth
          margin="normal"
          required
        />
        <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 2 }}>
          Redefinir Senha
        </Button>
      </form>
    </Container>
  );
};

export default ResetPassword; 