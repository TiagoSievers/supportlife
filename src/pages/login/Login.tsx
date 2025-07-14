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
        console.log('[Login] Sincronizando dados do Capacitor Preferences para localStorage...');
        
        // Lista de chaves que precisamos sincronizar
        const keysToSync = [
          'accessToken',
          'userToken',
          'userId',
          'userEmail',
          'userType',
          'clienteId',
          'socorristaId',
          'administradorId',
          'familiarId'
        ];

        let syncedKeys = 0;
        
        // Verifica cada chave no Preferences
        for (const key of keysToSync) {
          const { value } = await Preferences.get({ key });
          if (value) {
            // Se encontrou valor no Preferences, coloca no localStorage
            localStorage.setItem(key, value);
            console.log(`[Login] Sincronizado ${key}: ${key.includes('Token') || key.includes('Id') ? '[HIDDEN]' : value}`);
            syncedKeys++;
          }
        }

        console.log(`[Login] Total de chaves sincronizadas: ${syncedKeys}/${keysToSync.length}`);

        // Agora verifica se tem dados suficientes para autenticar
        const accessToken = localStorage.getItem('accessToken') || localStorage.getItem('userToken');
        const userId = localStorage.getItem('userId');

        if (!accessToken || !userId) {
          console.log('[Login] Dados insuficientes para autenticação automática');
          await clearAllStorage();
          return false;
        }

        console.log('[Login] Dados suficientes encontrados para autenticação automática');
        return true;
      } catch (error) {
        console.error('[Login] Erro ao sincronizar Preferences:', error);
        return false;
      }
    }
    return false;
  };

  // Função para limpar todos os storages
  const clearAllStorage = async () => {
    console.log('[Login] Limpando todos os storages...');
    
    // Limpa localStorage
    localStorage.clear();
    
    // Se estiver no mobile, limpa também o Preferences
    if (Capacitor.isNativePlatform()) {
      try {
        await Preferences.clear();
        console.log('[Login] Preferences limpo com sucesso');
      } catch (error) {
        console.error('[Login] Erro ao limpar Preferences:', error);
      }
    }
  };

  // Função auxiliar para salvar em ambos os storages
  const saveToStorage = async (key: string, value: string) => {
    console.log(`[Login] Salvando ${key}: ${key.includes('Token') || key.includes('Id') || key.includes('Email') ? '[HIDDEN]' : value}`);
    
    // Salva no localStorage
    localStorage.setItem(key, value);
    
    // Se estiver no mobile, salva também no Preferences
    if (Capacitor.isNativePlatform()) {
      try {
        await Preferences.set({ key, value });
        console.log(`[Login] ${key} salvo no Capacitor Preferences`);
      } catch (error) {
        console.error(`[Login] Erro ao salvar ${key} no Preferences:`, error);
      }
    }
  };

  // Redirecionamento automático se já estiver autenticado
  useEffect(() => {
    const checkAuthAndSync = async () => {
      console.log(`[Login] Verificando autenticação. Plataforma: ${Capacitor.isNativePlatform() ? 'Mobile Nativo' : 'Web'}`);
      
      // Se estiver no mobile, tenta sincronizar primeiro
      if (Capacitor.isNativePlatform()) {
        const hasSyncedData = await syncPreferencesToLocalStorage();
        if (!hasSyncedData) {
          console.log('[Login] Sincronização falhou ou dados insuficientes');
          return; // Se não conseguiu sincronizar, não tenta redirecionar
        }
      }

      // A partir daqui usa o localStorage normalmente
      const accessToken = localStorage.getItem('accessToken') || localStorage.getItem('userToken');
      const userId = localStorage.getItem('userId');

      if (!accessToken || !userId) {
        console.log('[Login] Credenciais não encontradas, limpando storages');
        await clearAllStorage();
        return;
      }

      console.log('[Login] Credenciais encontradas, verificando tipo de usuário...');

      // Verificar e redirecionar baseado no tipo de usuário
      if (localStorage.getItem('clienteId')) {
        console.log('[Login] Redirecionando cliente autenticado para /home');
        navigate('/home', { replace: true });
      } else if (localStorage.getItem('socorristaId')) {
        console.log('[Login] Redirecionando socorrista autenticado para /partner-emergencies');
        navigate('/partner-emergencies', { replace: true });
      } else if (localStorage.getItem('administradorId')) {
        console.log('[Login] Redirecionando administrador autenticado para /admin-panel');
        navigate('/admin-panel', { replace: true });
      } else if (localStorage.getItem('familiarId')) {
        console.log('[Login] Redirecionando familiar autenticado para /family-emergencies');
        navigate('/family-emergencies', { replace: true });
      } else {
        console.log('[Login] Tipo de usuário não identificado, limpando storages');
        await clearAllStorage();
      }
    };

    checkAuthAndSync();
  }, [navigate]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setLoading(true);
      setError(null);
      
      console.log('[Login] Iniciando processo de login...');
      
      // Limpa todos os storages antes de fazer o login
      await clearAllStorage();
      
      const { authData } = await login(email, password);
      const user_id = authData?.user?.id || authData?.user?.user_id || authData?.user_id || authData?.id;
      
      if (!user_id) {
        setError('Não foi possível identificar o usuário.');
        setLoading(false);
        return;
      }

      console.log('[Login] Login bem-sucedido, identificando tipo de usuário...');

      // Salva dados básicos do usuário primeiro
      await saveToStorage('userEmail', email);
      await saveToStorage('userId', user_id);
      
      // Salva o token de acesso se disponível
      if (authData?.access_token) {
        await saveToStorage('accessToken', authData.access_token);
      }
      if (authData?.token) {
        await saveToStorage('userToken', authData.token);
      }

      // Verifica tipo de usuário e salva informações específicas
      const isCliente = await existsInCliente(user_id);
      if (isCliente) {
        console.log('[Login] Usuário identificado como cliente');
        await saveToStorage('userType', 'cliente');
        const cliente = await getClienteByUserId(user_id);
        if (cliente && cliente.id) {
          await saveToStorage('clienteId', cliente.id.toString());
          console.log('[Login] ClienteId salvo nos storages');
        }
        navigate('/home');
        return;
      }

      const isSocorrista = await existsInSocorrista(user_id);
      if (isSocorrista) {
        console.log('[Login] Usuário identificado como socorrista');
        await saveToStorage('userType', 'socorrista');
        const socorrista = await getSocorristaByUserId(user_id);
        if (socorrista && socorrista.id) {
          await saveToStorage('socorristaId', socorrista.id.toString());
          console.log('[Login] SocorristaId salvo nos storages');
        }
        navigate('/partner-emergencies');
        return;
      }

      const isAdministrador = await existsInAdministrador(user_id);
      if (isAdministrador) {
        console.log('[Login] Usuário identificado como administrador');
        await saveToStorage('userType', 'administrador');
        const administrador = await getAdministradorByUserId(user_id);
        if (administrador && administrador.id) {
          await saveToStorage('administradorId', administrador.id.toString());
          console.log('[Login] AdministradorId salvo nos storages');
        }
        navigate('/admin-panel');
        return;
      }

      const isFamiliar = await existsInFamiliar(user_id);
      if (isFamiliar) {
        console.log('[Login] Usuário identificado como familiar');
        await saveToStorage('userType', 'familiar');
        const familiar = await getFamiliarByUserId(user_id);
        if (familiar && familiar.id) {
          await saveToStorage('familiarId', familiar.id.toString());
          console.log('[Login] FamiliarId salvo nos storages');
        }
        navigate('/family-emergencies');
        return;
      }

      console.log('[Login] Usuário não encontrado em nenhuma tabela específica');
      setError('Usuário não autorizado. Entre em contato com o suporte.');
      await clearAllStorage();
      
    } catch (error) {
      console.error('[Login] Erro ao realizar login:', error);
      setError('Email ou senha incorretos. Por favor, tente novamente.');
      await clearAllStorage();
    } finally {
      setLoading(false);
    }
  };

  const handleRecoverPassword = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('[Login] Iniciando recuperação de senha para:', email);
      await recoverPassword(email);
      alert('Instruções de recuperação de senha enviadas para o seu email.');
    } catch (error) {
      console.error('[Login] Erro na recuperação de senha:', error);
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
      
      {/* Debug info - só aparece em desenvolvimento */}
      {process.env.NODE_ENV === 'development' && (
        <Box sx={{ mb: 2, p: 1, backgroundColor: '#f5f5f5', borderRadius: 1, width: '100%' }}>
          <Typography variant="caption" color="text.secondary">
            Debug: Plataforma - {Capacitor.isNativePlatform() ? 'Mobile Nativo' : 'Web'}
          </Typography>
        </Box>
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