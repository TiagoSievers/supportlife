import React, { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box } from '@mui/material';
// Ajuste o import do tipo Chamado conforme o seu projeto
// import { Chamado } from './chamadosClient';

interface Chamado {
  id: string;
  cliente_id: string;
  status: string;
  data_abertura: string;
  localizacao: string;
  posicao_inicial_socorrista?: string;
}

interface ChamadoModalClientProps {
  open: boolean;
  chamado: Chamado | null;
  onClose: () => void;
}

const ChamadoModalClient: React.FC<ChamadoModalClientProps> = ({ open, chamado, onClose }) => {
  const [endereco, setEndereco] = useState<string | null>(null);

  useEffect(() => {
    if (chamado && chamado.localizacao) {
      // Aqui você pode usar sua função utilitária para buscar o endereço
      // Exemplo mock:
      setEndereco('Endereço do chamado');
    }
  }, [chamado]);

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
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Detalhes do Chamado</DialogTitle>
      <DialogContent sx={{ p: 2, pb: 0, position: 'relative' }}>
        {/* Conteúdo principal */}
        {chamado && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, position: 'relative', zIndex: 1, mt: 0 }}>
            <Typography><strong>Nº Chamado:</strong> {chamado.id}</Typography>
            <Typography><strong>Status:</strong> {chamado.status}</Typography>
            <Typography><strong>Data de abertura:</strong> {formatarDataHora(chamado.data_abertura)}</Typography>
            <Typography><strong>Localização:</strong> {chamado.localizacao}</Typography>
            <Typography><strong>Endereço:</strong> {endereco || chamado.localizacao}</Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" color="error" onClick={onClose} fullWidth>Fechar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ChamadoModalClient; 
