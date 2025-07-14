import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, List, ListItem, ListItemText, CircularProgress, Snackbar, Alert, Box } from '@mui/material';
import PhoneInTalkIcon from '@mui/icons-material/PhoneInTalk';
import { FamilyMember } from '../familiares/FamilyMemberDialog';
import { buscarFamiliares } from '../familiares/api';

interface Chamado {
  id: string;
  cliente_id: string;
  status: string;
  data_abertura: string;
  localizacao: string;
  posicao_inicial_socorrista?: string;
  endereco_textual?: string;
}

interface CallModalProps {
  open: boolean;
  chamadoId: number | null;
  onClose: () => void;
  nome?: string;
  endereco?: string;
  status?: string;
  telefone?: string;
  cliente?: any;
}

const CallModal: React.FC<CallModalProps> = ({ open, chamadoId, onClose, nome, endereco, status, telefone, cliente }) => {
  const [loading, setLoading] = useState(false);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [loadingFamiliares, setLoadingFamiliares] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({ open: false, message: '', severity: 'success' });
  const [notificados, setNotificados] = useState<string[]>([]);

  // Novos estados para lista de chamados do cliente
  const [chamadosCliente, setChamadosCliente] = useState<Chamado[]>([]);
  const [loadingChamadosCliente, setLoadingChamadosCliente] = useState(false);

  const [telefoneCliente, setTelefoneCliente] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (open) {
      setNotificados([]);
      setTelefoneCliente(undefined);
      setLoadingFamiliares(true);

      // LOG DETALHADO DA CHAMADA DE FAMILIARES
      console.log('[CallModal] useEffect aberto!');
      console.log('[CallModal] chamadoId:', chamadoId);
      console.log('[CallModal] Variáveis de ambiente:', {
        REACT_APP_SUPABASE_URL: process.env.REACT_APP_SUPABASE_URL,
        REACT_APP_SUPABASE_SERVICE_KEY: process.env.REACT_APP_SUPABASE_SERVICE_KEY
      });
      console.log('[CallModal] accessToken:', localStorage.getItem('accessToken'));

      // Primeiro buscar o cliente_id do chamado
      const fetchFamiliares = async () => {
        try {
          if (!chamadoId) {
            console.log('[CallModal] chamadoId não fornecido');
            return;
          }
          const url = process.env.REACT_APP_SUPABASE_URL;
          const serviceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY;
          const accessToken = localStorage.getItem('accessToken');
          if (!url || !serviceKey) throw new Error('Supabase URL ou Service Key não definidos');
          if (!accessToken) throw new Error('accessToken não encontrado no localStorage');
          
          // Buscar o chamado para pegar o cliente_id
          const chamadoUrl = `${url}/rest/v1/chamado?id=eq.${chamadoId}`;
          console.log('[CallModal] Buscando chamado:', chamadoUrl);
          const chamadoResp = await fetch(chamadoUrl, {
            headers: {
              'apikey': serviceKey,
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            }
          });
          const chamadoData = await chamadoResp.json();
          console.log('[CallModal] Dados do chamado:', chamadoData);
          if (!chamadoData[0] || !chamadoData[0].cliente_id) {
            console.log('[CallModal] Chamado não encontrado ou sem cliente_id');
            return;
          }
          const clienteId = chamadoData[0].cliente_id;
          console.log('[CallModal] clienteId do chamado:', clienteId);

          // Buscar familiares do cliente
          const familiaresUrl = `${url}/rest/v1/familiares?cliente_id=eq.${clienteId}`;
          console.log('[CallModal] Buscando familiares:', familiaresUrl);
          const familiaresResp = await fetch(familiaresUrl, {
            headers: {
              'apikey': serviceKey,
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            }
          });
          const familiares = await familiaresResp.json();
          console.log('[CallModal] Familiares encontrados:', familiares);
          
          // Filtrar apenas os não deletados
          const members = familiares
            .filter((f: any) => !f.deletado)
            .map((f: any) => ({
              id: f.id?.toString() || '',
              name: f.nome,
              relationship: f.parentesco,
              phone: f.telefone,
              email: f.email,
              isEmergencyContact: f.contato_emergencia || false,
            }));
          
          console.log('[CallModal] Members processados:', members);
          setFamilyMembers(members);
        } catch (error) {
          console.error('[CallModal] Erro ao buscar familiares:', error);
          setFamilyMembers([]);
        } finally {
          setLoadingFamiliares(false);
        }
      };

      fetchFamiliares();

      // Buscar lista de chamados do cliente
      const fetchChamadosCliente = async () => {
        setLoadingChamadosCliente(true);
        try {
          if (!chamadoId) return;
          const url = process.env.REACT_APP_SUPABASE_URL;
          const serviceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY;
          const accessToken = localStorage.getItem('accessToken');
          const administradorId = localStorage.getItem('administradorId');
          if (!url || !serviceKey) throw new Error('Supabase URL ou Service Key não definidos');
          if (!accessToken) throw new Error('accessToken não encontrado no localStorage');
          if (!administradorId) throw new Error('administradorId não encontrado no localStorage');
          const headers = {
            'apikey': serviceKey,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          };
          // Buscar o chamado atual para pegar o cliente_id
          const chamadoResp = await fetch(`${url}/rest/v1/chamado?id=eq.${chamadoId}`, {
            headers
          });
          const chamadoData = await chamadoResp.json();
          if (!chamadoData[0] || !chamadoData[0].cliente_id) return;
          const clienteId = chamadoData[0].cliente_id;
          // Buscar dados do cliente
          const clienteResp = await fetch(`${url}/rest/v1/cliente?id=eq.${clienteId}`, { headers });
          const clienteData = await clienteResp.json();
          if (clienteData && clienteData[0]) {
            telefone = clienteData[0].telefone || '';
            nome = clienteData[0].nome || '';
          }
          setTelefoneCliente(clienteData[0]?.telefone);
          // Buscar todos os chamados do cliente (corrigido para usar variáveis de ambiente)
          const chamadosUrl = `${url}/rest/v1/chamado?select=*&cliente_id=eq.${clienteId}&order=data_abertura.desc`;
          const response = await fetch(chamadosUrl, {
            headers: {
              'apikey': serviceKey,
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          });
          const data = await response.json();
          setChamadosCliente(data);
        } catch (err) {
          setChamadosCliente([]);
        } finally {
          setLoadingChamadosCliente(false);
        }
      };
      fetchChamadosCliente();
    }
  }, [open]);

  const handleNotificar = async (member: FamilyMember) => {
    if (!chamadoId) return;
    setLoading(true);
    try {
      const url = process.env.REACT_APP_SUPABASE_URL;
      const serviceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY;
      const accessToken = localStorage.getItem('accessToken');
      const administradorId = localStorage.getItem('administradorId');
      if (!url || !serviceKey) throw new Error('Supabase URL ou Service Key não definidos');
      if (!accessToken) throw new Error('accessToken não encontrado no localStorage');
      if (!administradorId) throw new Error('administradorId não encontrado no localStorage');
      const headers = {
        'apikey': serviceKey,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      };
      // Buscar notificacao_familiares atual
      const getResp = await fetch(`${url}/rest/v1/chamado?id=eq.${chamadoId}&select=notificacao_familiares`, {
        method: 'GET',
        headers
      });
      if (!getResp.ok) throw new Error('Erro ao buscar notificações atuais');
      const data = await getResp.json();
      let lista = Array.isArray(data) && data[0]?.notificacao_familiares ? data[0].notificacao_familiares : [];
      // Evitar duplicidade
      if (!lista.some((f: any) => f.id === member.id)) {
        lista.push({
          id: member.id,
          name: member.name,
          relationship: member.relationship,
          phone: member.phone,
          email: member.email,
          isEmergencyContact: member.isEmergencyContact
        });
      }
      // Atualizar no Supabase
      const patchResp = await fetch(`${url}/rest/v1/chamado?id=eq.${chamadoId}`, {
        method: 'PATCH',
        headers: {
          ...headers,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ notificacao_familiares: lista })
      });
      if (!patchResp.ok) throw new Error('Erro ao atualizar notificação dos familiares');
      setNotificados((prev) => [...prev, member.id]);
      setSnackbar({ open: true, message: `Familiar ${member.name} notificado com sucesso!`, severity: 'success' });
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Erro ao notificar familiar.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSnackbar = () => setSnackbar({ ...snackbar, open: false });

  const handleAceitar = async () => {
    if (!chamadoId) return;
    const url = process.env.REACT_APP_SUPABASE_URL;
    const serviceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY;
    const accessToken = localStorage.getItem('accessToken');
    const administradorId = localStorage.getItem('administradorId');
    if (!url || !serviceKey) throw new Error('Supabase URL ou Service Key não definidos');
    if (!accessToken) throw new Error('accessToken não encontrado no localStorage');
    if (!administradorId) throw new Error('administradorId não encontrado no localStorage');
    const headers = {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    };
    const endpoint = `${url}/rest/v1/chamado?select=*&id=eq.${chamadoId}`;
    const body = JSON.stringify({ status: 'Aceito / Em andamento', operador_id: administradorId });
    try {
      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers,
        body
      });
      if (response.ok) {
        // Buscar dados do chamado atualizado
        const chamadoResp = await fetch(`${url}/rest/v1/chamado?id=eq.${chamadoId}`, { headers });
        const chamadoData = await chamadoResp.json();
        if (chamadoData && chamadoData[0]) {
          const logData = {
            chamado_id: chamadoData[0].id,
            cliente_id: chamadoData[0].cliente_id,
            localizacao: chamadoData[0].localizacao,
            endereco_textual: chamadoData[0].endereco_textual,
            status: chamadoData[0].status,
            operador_id: chamadoData[0].operador_id,
            socorrista_id: chamadoData[0].socorrista_id,
            data_abertura: chamadoData[0].data_abertura,
            data_fechamento: chamadoData[0].data_fechamento,
            descricao: chamadoData[0].descricao,
            prioridade: chamadoData[0].prioridade,
            notificacao_familiares: chamadoData[0].notificacao_familiares,
            posicao_inicial_socorrista: chamadoData[0].posicao_inicial_socorrista
          };
          await fetch(`${url}/rest/v1/log_chamado`, {
            method: 'POST',
            headers,
            body: JSON.stringify(logData)
          });
        }
      }
      if (response.status === 204) {
        setSnackbar({ open: true, message: 'Status do chamado alterado com sucesso!', severity: 'success' });
      } else {
        const text = await response.text();
        if (text) {
          try {
            const data = JSON.parse(text);
            setSnackbar({ open: true, message: 'Status do chamado alterado com sucesso!', severity: 'success' });
          } catch (jsonErr) {
            // Erro ao fazer parse do JSON
          }
        } else {
          setSnackbar({ open: true, message: 'Status do chamado alterado com sucesso!', severity: 'success' });
        }
      }
    } catch (err) {
      // Tratar erro
    }
  };

  function formatarDataHora(data: string) {
    if (!data) return '';
    const d = new Date(data);
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const ano = d.getFullYear();
    const hora = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dia}/${mes}/${ano} ${hora}:${min}`;
  }

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        Chamado #{chamadoId}
      </DialogTitle>
      <DialogContent>
        {/* Exibe todos os campos principais do cliente, se existirem */}
        {cliente && (
          <Box sx={{ mt: 1, mb: 2 }}>
            <Typography><strong>ID:</strong> {cliente.id}</Typography>
            <Typography><strong>Nome:</strong> {cliente.nome}</Typography>
            <Typography><strong>Telefone:</strong> {cliente.telefone || 'Não informado'}</Typography>
            <Typography><strong>Status:</strong> {cliente.status}</Typography>
            {endereco && (
              <Typography><strong>Endereço:</strong> {endereco}</Typography>
            )}
          </Box>
        )}
        {/* Fallback para exibir nome/telefone/endereco antigos se não houver cliente */}
        {!cliente && (
          <>
            {nome && (
              <Typography sx={{ mt: 1 }}><strong>Nome:</strong> {nome}</Typography>
            )}
            <Typography sx={{ mt: 1 }}>
              <strong>Telefone:</strong> {telefone || telefoneCliente || 'Não informado'}
            </Typography>
            {endereco && (
              <Typography sx={{ mt: 1 }}><strong>Endereço:</strong> {endereco}</Typography>
            )}
          </>
        )}
        <Button
          onClick={handleAceitar}
          color="success"
          variant="contained"
          disabled={
            loading ||
            !chamadoId ||
            status === 'Aceito / Em andamento' ||
            status === 'A caminho' ||
            status === 'finalizado' ||
            status === 'Ambulância no local' ||
            status === 'concluído'
          }
          sx={{ mt: 2 }}
          fullWidth
        >
          {status === 'Aceito / Em andamento' ? 'Chamado Aceito' : 'Aceitar o chamado'}
        </Button>
        <Button
          onClick={async () => {
            console.log('Botão Em análise clicado');
            if (!chamadoId) return;
            const url = process.env.REACT_APP_SUPABASE_URL;
            const serviceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY;
            const accessToken = localStorage.getItem('accessToken');
            const administradorId = localStorage.getItem('administradorId');
            if (!url || !serviceKey) throw new Error('Supabase URL ou Service Key não definidos');
            if (!accessToken) throw new Error('accessToken não encontrado no localStorage');
            if (!administradorId) throw new Error('administradorId não encontrado no localStorage');
            const headers = {
              'apikey': serviceKey,
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            };
            const endpoint = `${url}/rest/v1/chamado?select=*&id=eq.${chamadoId}`;
            const body = JSON.stringify({ status: 'Em análise', operador_id: administradorId });
            try {
              const response = await fetch(endpoint, {
                method: 'PATCH',
                headers,
                body
              });
              if (response.ok) {
                // Buscar dados do chamado atualizado
                const chamadoResp = await fetch(`${url}/rest/v1/chamado?id=eq.${chamadoId}`, { headers });
                const chamadoData = await chamadoResp.json();
                if (chamadoData && chamadoData[0]) {
                  const logData = {
                    chamado_id: chamadoData[0].id,
                    cliente_id: chamadoData[0].cliente_id,
                    localizacao: chamadoData[0].localizacao,
                    endereco_textual: chamadoData[0].endereco_textual,
                    status: chamadoData[0].status,
                    operador_id: chamadoData[0].operador_id,
                    socorrista_id: chamadoData[0].socorrista_id,
                    data_abertura: chamadoData[0].data_abertura,
                    data_fechamento: chamadoData[0].data_fechamento,
                    descricao: chamadoData[0].descricao,
                    prioridade: chamadoData[0].prioridade,
                    notificacao_familiares: chamadoData[0].notificacao_familiares,
                    posicao_inicial_socorrista: chamadoData[0].posicao_inicial_socorrista
                  };
                  await fetch(`${url}/rest/v1/log_chamado`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(logData)
                  });
                }
              }
              if (response.status === 204) {
                console.log('[PATCH chamado] Sucesso: No Content (204)');
                setSnackbar({ open: true, message: 'Status do chamado alterado para Em análise!', severity: 'success' });
              } else {
                const text = await response.text();
                if (text) {
                  try {
                    const data = JSON.parse(text);
                    console.log('[PATCH chamado] Resposta:', data);
                    setSnackbar({ open: true, message: 'Status do chamado alterado para Em análise!', severity: 'success' });
                  } catch (jsonErr) {
                    console.log('[PATCH chamado] Resposta não JSON:', text);
                  }
                } else {
                  console.log('[PATCH chamado] Sucesso: resposta vazia');
                  setSnackbar({ open: true, message: 'Status do chamado alterado para Em análise!', severity: 'success' });
                }
              }
            } catch (err) {
              console.error('[PATCH chamado] Erro:', err);
            }
          }}
          color="info"
          variant="contained"
          disabled={
            loading ||
            !chamadoId ||
            status === 'Em análise' ||
            status === 'Aceito / Em andamento' ||
            status === 'A caminho' ||
            status === 'finalizado' ||
            status === 'Ambulância no local' ||
            status === 'concluído'
          }
          sx={{ mt: 2 }}
          fullWidth
        >
          {status === 'Em análise' ? 'Chamado Em Análise' : 'Em análise'}
        </Button>
        <Button
          onClick={async () => {
            console.log('Botão Finalizar chamado clicado');
            if (!chamadoId) return;
            const url = process.env.REACT_APP_SUPABASE_URL;
            const serviceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY;
            const accessToken = localStorage.getItem('accessToken');
            const administradorId = localStorage.getItem('administradorId');
            if (!url || !serviceKey) throw new Error('Supabase URL ou Service Key não definidos');
            if (!accessToken) throw new Error('accessToken não encontrado no localStorage');
            if (!administradorId) throw new Error('administradorId não encontrado no localStorage');
            const headers = {
              'apikey': serviceKey,
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            };
            const endpoint = `${url}/rest/v1/chamado?select=*&id=eq.${chamadoId}`;
            const body = JSON.stringify({ status: 'finalizado', operador_id: administradorId });
            try {
              const response = await fetch(endpoint, {
                method: 'PATCH',
                headers,
                body
              });
              if (response.ok) {
                // Buscar dados do chamado atualizado
                const chamadoResp = await fetch(`${url}/rest/v1/chamado?id=eq.${chamadoId}`, { headers });
                const chamadoData = await chamadoResp.json();
                if (chamadoData && chamadoData[0]) {
                  const logData = {
                    chamado_id: chamadoData[0].id,
                    cliente_id: chamadoData[0].cliente_id,
                    localizacao: chamadoData[0].localizacao,
                    endereco_textual: chamadoData[0].endereco_textual,
                    status: chamadoData[0].status,
                    operador_id: chamadoData[0].operador_id,
                    socorrista_id: chamadoData[0].socorrista_id,
                    data_abertura: chamadoData[0].data_abertura,
                    data_fechamento: chamadoData[0].data_fechamento,
                    descricao: chamadoData[0].descricao,
                    prioridade: chamadoData[0].prioridade,
                    notificacao_familiares: chamadoData[0].notificacao_familiares,
                    posicao_inicial_socorrista: chamadoData[0].posicao_inicial_socorrista
                  };
                  await fetch(`${url}/rest/v1/log_chamado`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(logData)
                  });
                }
              }
              if (response.status === 204) {
                console.log('[PATCH chamado] Sucesso: No Content (204)');
                setSnackbar({ open: true, message: 'Chamado finalizado com sucesso!', severity: 'success' });
              } else {
                const text = await response.text();
                if (text) {
                  try {
                    const data = JSON.parse(text);
                    console.log('[PATCH chamado] Resposta:', data);
                    setSnackbar({ open: true, message: 'Chamado finalizado com sucesso!', severity: 'success' });
                  } catch (jsonErr) {
                    console.log('[PATCH chamado] Resposta não JSON:', text);
                  }
                } else {
                  console.log('[PATCH chamado] Sucesso: resposta vazia');
                  setSnackbar({ open: true, message: 'Chamado finalizado com sucesso!', severity: 'success' });
                }
              }
            } catch (err) {
              console.error('[PATCH chamado] Erro:', err);
            }
          }}
          color="error"
          variant="contained"
          disabled={
            loading ||
            !chamadoId ||
            status === 'A caminho' ||
            status === 'finalizado' ||
            status === 'Ambulância no local' ||
            status === 'concluído'
          }
          sx={{ mt: 2, mb: 2 }}
          fullWidth
        >
          Recusar/finalizar atendimento
        </Button>
        <Typography sx={{ mt: 2, mb: 1 }} variant="subtitle1"><strong>Familiares do Cliente</strong></Typography>
        {loadingFamiliares ? (
          <CircularProgress size={28} sx={{ display: 'block', mx: 'auto', my: 2 }} />
        ) : familyMembers.length === 0 ? (
          <Typography color="text.secondary">Nenhum familiar cadastrado.</Typography>
        ) : (
          <List>
            {familyMembers.map((member) => (
              <ListItem key={member.id} secondaryAction={
                notificados.includes(member.id) ? (
                  <Button variant="contained" color="success" disabled>
                    Notificado
                  </Button>
                ) : (
                  <Button variant="outlined" color="primary" onClick={() => handleNotificar(member)} disabled={loading}>
                    Notificar
                  </Button>
                )
              }>
                <ListItemText
                  primary={member.name}
                  secondary={
                    <>
                      {member.relationship && <span>{member.relationship} &nbsp;|&nbsp; </span>}
                      {member.phone && <span>{member.phone}</span>}
                      {member.email && <><br />{member.email}</>}
                      {member.isEmergencyContact && <><br /><strong>Contato de Emergência</strong></>}
                    </>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary" disabled={loading}>Fechar</Button>
      </DialogActions>
      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Dialog>
  );
};

export default CallModal; 