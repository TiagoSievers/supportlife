import React, { useState } from 'react';
import { TextField, Button, Container, Typography, Box, CircularProgress } from '@mui/material';
import { useNavigate, Link } from 'react-router-dom';
import { login, recoverPassword, fetchUserByEmail, existsInCliente, existsInSocorrista, existsInAdministrador, getClienteByUserId, getSocorristaByUserId, getAdministradorByUserId, existsInFamiliar, getFamiliarByUserId } from './api';
import Logo from '../../assets/cropped_image.png';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showLogin, setShowLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setLoading(true);
      setError(null);
      
      const { authData } = await login(email, password);
      const user_id = authData?.user?.id || authData?.user?.user_id || authData?.user_id || authData?.id;
      if (!user_id) {
        setError('Não foi possível identificar o usuário.');
        setLoading(false);
        return;
      }
      const isCliente = await existsInCliente(user_id);
      if (isCliente) {
        console.log('Usuário pertence à tabela cliente');
        localStorage.setItem('userEmail', email);
        localStorage.setItem('userId', user_id);
        const cliente = await getClienteByUserId(user_id);
        if (cliente && cliente.id) {
          localStorage.setItem('clienteId', cliente.id.toString());
        }
        navigate('/home');
        return;
      }
      const isSocorrista = await existsInSocorrista(user_id);
      if (isSocorrista) {
        console.log('Usuário pertence à tabela socorrista');
        localStorage.setItem('userEmail', email);
        localStorage.setItem('userId', user_id);
        const socorrista = await getSocorristaByUserId(user_id);
        if (socorrista && socorrista.id) {
          localStorage.setItem('socorristaId', socorrista.id.toString());
        }
        navigate('/partner-emergencies');
        return;
      }
      const isAdministrador = await existsInAdministrador(user_id);
      if (isAdministrador) {
        console.log('Usuário pertence à tabela administrador');
        localStorage.setItem('userEmail', email);
        localStorage.setItem('userId', user_id);
        const administrador = await getAdministradorByUserId(user_id);
        if (administrador && administrador.id) {
          localStorage.setItem('administradorId', administrador.id.toString());
        }
        navigate('/admin-panel');
        return;
      }
      const isFamiliar = await existsInFamiliar(user_id);
      if (isFamiliar) {
        console.log('Usuário pertence à tabela familiares');
        localStorage.setItem('userEmail', email);
        localStorage.setItem('userId', user_id);
        const familiar = await getFamiliarByUserId(user_id);
        if (familiar && familiar.id) {
          localStorage.setItem('familiarId', familiar.id.toString());
        }
        navigate('/family-emergencies');
        return;
      }
      setError('Usuário não autorizado. Entre em contato com o suporte.');
    } catch (error) {
      console.error('Erro ao realizar login:', error);
      setError('Email ou senha incorretos. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleRecoverPassword = async () => {
    try {
      setLoading(true);
      setError(null);
      
      await recoverPassword(email);
      alert('Instruções de recuperação de senha enviadas para o seu email.');
    } catch (error) {
      setError('Erro ao enviar instruções de recuperação de senha. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', minHeight: '100vh', pt: 4 }}>
      <img src={Logo} alt="Logo" style={{ width: '256px', height: '224px', marginBottom: '20px' }} />
      <Typography variant="h5" component="h2" gutterBottom>
        {showLogin ? 'Login' : 'Recuperar Senha'}
      </Typography>
      
      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}
      
      {showLogin ? (
        <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%', mt: 2 }}>
          <TextField
            label="Email"
            type="email"
            fullWidth
            margin="dense"
            variant="outlined"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            required
          />
          <TextField
            label="Senha"
            type="password"
            fullWidth
            margin="dense"
            variant="outlined"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            required
          />
          <Button 
            type="submit" 
            variant="contained" 
            color="primary" 
            fullWidth 
            sx={{ mt: 2 }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Entrar'}
          </Button>
          <Button 
            onClick={() => setShowLogin(false)} 
            variant="text" 
            color="primary" 
            fullWidth 
            sx={{ mt: 1 }}
            disabled={loading}
          >
            Esqueceu a senha?
          </Button>
        </Box>
      ) : (
        <Box sx={{ mt: 2, width: '100%' }}>
          <TextField
            label="Email para recuperação"
            type="email"
            fullWidth
            margin="dense"
            variant="outlined"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            required
          />
          <Button 
            onClick={handleRecoverPassword} 
            variant="contained" 
            color="primary" 
            fullWidth 
            sx={{ mt: 1 }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Enviar Instruções'}
          </Button>
          <Button 
            onClick={() => setShowLogin(true)} 
            variant="text" 
            color="primary" 
            fullWidth 
            sx={{ mt: 1 }}
            disabled={loading}
          >
            Voltar ao Login
          </Button>
        </Box>
      )}
    </Container>
  );
};

export default Login; 
