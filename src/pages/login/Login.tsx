import React, { useState, useEffect } from 'react';
import { TextField, Button, Container, Typography, Box, CircularProgress } from '@mui/material';
import { useNavigate, Link } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { login, recoverPassword, fetchUserByEmail, existsInCliente, existsInSocorrista, existsInAdministrador, getClienteByUserId, getSocorristaByUserId, getAdministradorByUserId, existsInFamiliar, getFamiliarByUserId } from './api';
import Logo from '../../assets/cropped_image.png';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showLogin, setShowLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Função para sincronizar Preferences com localStorage
  const syncPreferencesToLocalStorage = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        // Lista de chaves que precisamos sincronizar
        const keysToSync = [
          'accessToken',
          'userToken',
          'userId',
          'userEmail',
          'clienteId',
          'socorristaId',
          'administradorId',
          'familiarId'
        ];

        // Verifica cada chave no Preferences
        for (const key of keysToSync) {
          const { value } = await Preferences.get({ key });
          if (value) {
            // Se encontrou valor no Preferences, coloca no localStorage
            localStorage.setItem(key, value);
            console.log(`Sincronizado ${key} do Preferences para localStorage`);
          }
        }

        // Agora verifica se tem dados suficientes para autenticar
        const accessToken = localStorage.getItem('accessToken') || localStorage.getItem('userToken');
        const userId = localStorage.getItem('userId');

        if (!accessToken || !userId) {
          localStorage.clear();
          return false;
        }

        return true;
      } catch (error) {
        console.error('Erro ao sincronizar Preferences:', error);
        return false;
      }
    }
    return false;
  };

  // Função auxiliar para salvar em ambos os storages
  const saveToStorage = async (key: string, value: string) => {
    // Salva no localStorage
    localStorage.setItem(key, value);
    
    // Se estiver no mobile, salva também no Preferences
    if (Capacitor.isNativePlatform()) {
      try {
        await Preferences.set({ key, value });
      } catch (error) {
        console.error('Erro ao salvar no Preferences:', error);
      }
    }
  };

  // Redirecionamento automático se já estiver autenticado
  useEffect(() => {
    const checkAuthAndSync = async () => {
      // Se estiver no mobile, tenta sincronizar primeiro
      if (Capacitor.isNativePlatform()) {
        const hasSyncedData = await syncPreferencesToLocalStorage();
        if (!hasSyncedData) {
          return; // Se não conseguiu sincronizar, não tenta redirecionar
        }
      }

      // A partir daqui usa o localStorage normalmente
      const accessToken = localStorage.getItem('accessToken') || localStorage.getItem('userToken');
      const userId = localStorage.getItem('userId');

      if (!accessToken || !userId) {
        localStorage.clear();
        return;
      }

      // Verificar e redirecionar baseado no tipo de usuário
      if (localStorage.getItem('clienteId')) {
        console.log('Redirecionando cliente autenticado para /home');
        navigate('/home', { replace: true });
      } else if (localStorage.getItem('socorristaId')) {
        console.log('Redirecionando socorrista autenticado para /partner-emergencies');
        navigate('/partner-emergencies', { replace: true });
      } else if (localStorage.getItem('administradorId')) {
        console.log('Redirecionando administrador autenticado para /admin-panel');
        navigate('/admin-panel', { replace: true });
      } else if (localStorage.getItem('familiarId')) {
        console.log('Redirecionando familiar autenticado para /family-emergencies');
        navigate('/family-emergencies', { replace: true });
      } else {
        localStorage.clear();
      }
    };

    checkAuthAndSync();
  }, [navigate]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setLoading(true);
      setError(null);
      
      // Limpa o localStorage antes de fazer o login
      localStorage.clear();
      if (Capacitor.isNativePlatform()) {
        try {
          await Preferences.clear();
        } catch (error) {
          console.error('Erro ao limpar Preferences:', error);
        }
      }
      
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
        await saveToStorage('userEmail', email);
        await saveToStorage('userId', user_id);
        await saveToStorage('userType', 'cliente');
        const cliente = await getClienteByUserId(user_id);
        if (cliente && cliente.id) {
          await saveToStorage('clienteId', cliente.id.toString());
        }
        navigate('/home');
        return;
      }

      const isSocorrista = await existsInSocorrista(user_id);
      if (isSocorrista) {
        console.log('Usuário pertence à tabela socorrista');
        await saveToStorage('userEmail', email);
        await saveToStorage('userId', user_id);
        await saveToStorage('userType', 'socorrista');
        const socorrista = await getSocorristaByUserId(user_id);
        if (socorrista && socorrista.id) {
          await saveToStorage('socorristaId', socorrista.id.toString());
        }
        navigate('/partner-emergencies');
        return;
      }

      const isAdministrador = await existsInAdministrador(user_id);
      if (isAdministrador) {
        console.log('Usuário pertence à tabela administrador');
        await saveToStorage('userEmail', email);
        await saveToStorage('userId', user_id);
        await saveToStorage('userType', 'administrador');
        const administrador = await getAdministradorByUserId(user_id);
        if (administrador && administrador.id) {
          await saveToStorage('administradorId', administrador.id.toString());
        }
        navigate('/admin-panel');
        return;
      }

      const isFamiliar = await existsInFamiliar(user_id);
      if (isFamiliar) {
        console.log('Usuário pertence à tabela familiares');
        await saveToStorage('userEmail', email);
        await saveToStorage('userId', user_id);
        await saveToStorage('userType', 'familiar');
        const familiar = await getFamiliarByUserId(user_id);
        if (familiar && familiar.id) {
          await saveToStorage('familiarId', familiar.id.toString());
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