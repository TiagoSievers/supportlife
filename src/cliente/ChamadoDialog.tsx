import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Button,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Box,
  Typography,
  ListItemButton
} from '@mui/material';

export interface Chamado {
  id: number;
  cliente_id: number;
  localizacao: string;
  endereco_textual: string;
  status: string;
  criado_em?: string;
}

interface ChamadoDialogProps {
  open: boolean;
  onClose: () => void;
  initialData?: Chamado;
  onSave: (data: Chamado) => void;
  isEditing?: boolean;
}

const emptyChamado: Chamado = {
  id: 0,
  cliente_id: 0,
  localizacao: '',
  endereco_textual: '',
  status: 'Pendente',
};

const ChamadoDialog: React.FC<ChamadoDialogProps> = ({ open, onClose, initialData, onSave, isEditing }) => {
  const [formData, setFormData] = useState<Chamado>(initialData || emptyChamado);
  const [loading, setLoading] = useState(false);
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [loadingChamados, setLoadingChamados] = useState(false);
  const [selectedChamadoId, setSelectedChamadoId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Buscar lista de chamados do cliente logado
  useEffect(() => {
    if (open) {
      const clienteId = localStorage.getItem('clienteId');
      if (!clienteId) {
        setError('Cliente não identificado.');
        setChamados([]);
        return;
      }
      setLoadingChamados(true);
      setError(null);
      const url = process.env.REACT_APP_SUPABASE_URL;
      const serviceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY;
      if (!url || !serviceKey) {
        setError('Supabase URL ou Service Key não definidos.');
        setChamados([]);
        setLoadingChamados(false);
        return;
      }
      const accessToken = localStorage.getItem('accessToken');
      fetch(`${url}/rest/v1/chamado?select=*&cliente_id=eq.${clienteId}`, {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      })
        .then(async res => {
          if (!res.ok) {
            throw new Error('Erro ao buscar chamados: ' + res.status);
          }
          return res.json();
        })
        .then((data) => {
          const chamadosArray = Array.isArray(data) ? data : [];
          setChamados(chamadosArray);
          if (chamadosArray.length > 0) {
            setSelectedChamadoId(chamadosArray[0].id);
            setFormData(chamadosArray[0]);
          } else {
            setSelectedChamadoId(null);
            setFormData(emptyChamado);
          }
        })
        .catch((err) => {
          setError(err.message || 'Erro ao buscar chamados.');
          setChamados([]);
        })
        .finally(() => setLoadingChamados(false));
    }
  }, [open]);

  // Atualiza formData ao selecionar chamado
  useEffect(() => {
    if (selectedChamadoId !== null) {
      const chamado = chamados.find(c => c.id === selectedChamadoId);
      if (chamado) setFormData(chamado);
    }
  }, [selectedChamadoId, chamados]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      onSave(formData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Histórico de Chamados</DialogTitle>
      <DialogContent>
        {loadingChamados ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography color="error">{error}</Typography>
        ) : (
          <Box sx={{ display: 'flex', gap: 3 }}>
            <Box sx={{ minWidth: 260, maxWidth: 320 }}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>Seus chamados</Typography>
              <List dense>
                {chamados.length === 0 ? (
                  <ListItem>
                    <ListItemText primary="Nenhum chamado encontrado." />
                  </ListItem>
                ) : (
                  chamados.map((chamado) => (
                    <ListItemButton
                      key={chamado.id}
                      selected={selectedChamadoId === chamado.id}
                      onClick={() => setSelectedChamadoId(chamado.id)}
                    >
                      <ListItemText
                        primary={`#${chamado.id} - ${chamado.status}`}
                        secondary={chamado.criado_em ? new Date(chamado.criado_em).toLocaleString() : ''}
                      />
                    </ListItemButton>
                  ))
                )}
              </List>
            </Box>
            <Box sx={{ flex: 1 }}>
              {/* Todos os TextField removidos, apenas exibição da lista */}
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fechar</Button>
        {isEditing && (
          <Button onClick={handleSave} variant="contained" disabled={loading}>Salvar</Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ChamadoDialog; 