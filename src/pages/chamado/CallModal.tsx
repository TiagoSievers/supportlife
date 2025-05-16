import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import PhoneInTalkIcon from '@mui/icons-material/PhoneInTalk';

interface CallModalProps {
  open: boolean;
  chamadoId: number | null;
  onClose: () => void;
  nome?: string;
  endereco?: string;
}

const CallModal: React.FC<CallModalProps> = ({ open, chamadoId, onClose, nome, endereco }) => {
  const [loading, setLoading] = useState(false);
  const [prioridade, setPrioridade] = useState('baixa');

  const handleAceitar = async () => {
    if (!chamadoId) return;
    setLoading(true);
    try {
      const url = process.env.REACT_APP_SUPABASE_URL;
      const serviceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY;
      if (!url || !serviceKey) throw new Error('Supabase URL ou Service Key não definidos');
      const response = await fetch(`${url}/rest/v1/chamado?id=eq.${chamadoId}`, {
        method: 'PATCH',
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ status: 'Aceito / Em andamento', prioridade })
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error_description || data.message || `Erro ${response.status}`);
      }
      onClose();
    } catch (err) {
      alert('Erro ao aceitar chamado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <PhoneInTalkIcon color="primary" /> Ligando para o chamado #{chamadoId}
      </DialogTitle>
      <DialogContent>
        <Typography>Realizando contato com o responsável pelo chamado...</Typography>
        {nome && (
          <Typography sx={{ mt: 1 }}><strong>Nome:</strong> {nome}</Typography>
        )}
        {endereco && (
          <Typography sx={{ mt: 1 }}><strong>Endereço:</strong> {endereco}</Typography>
        )}
        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel id="prioridade-label">Prioridade</InputLabel>
          <Select
            labelId="prioridade-label"
            value={prioridade}
            label="Prioridade"
            onChange={e => setPrioridade(e.target.value)}
            disabled={loading}
          >
            <MenuItem value="baixa">Baixa</MenuItem>
            <MenuItem value="média">Média</MenuItem>
            <MenuItem value="alta">Alta</MenuItem>
            <MenuItem value="urgente">Urgente</MenuItem>
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary" disabled={loading}>Fechar</Button>
        <Button onClick={handleAceitar} color="success" variant="contained" disabled={loading || !chamadoId}>
          Aceitar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CallModal; 