import React from 'react';
import {
  Box,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import { addFamiliar, Familiar } from '../Supabase/supabaseClient';

export interface FamilyMember {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email: string;
  isEmergencyContact: boolean;
}

interface FamilyMemberFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (member: FamilyMember) => void;
  member: FamilyMember;
  isEditing: boolean;
}

const FamilyMemberForm: React.FC<FamilyMemberFormProps> = ({
  open,
  onClose,
  onSave,
  member,
  isEditing
}) => {
  const [formData, setFormData] = React.useState<FamilyMember>(member);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setFormData(member);
  }, [member]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      // Pegar o ID do usuário do localStorage (salvo durante o login)
      const userData = localStorage.getItem('userData');
      if (!userData) {
        throw new Error('Usuário não está autenticado');
      }
      const user = JSON.parse(userData);

      // Converter FamilyMember para o formato do Supabase (Familiar)
      const familiar: Familiar = {
        user_id: user.id,
        nome: formData.name,
        parentesco: formData.relationship,
        telefone: formData.phone,
        email: formData.email,
        contato_emergencia: formData.isEmergencyContact
      };

      // Salvar no Supabase
      const familiarSalvo = await addFamiliar(familiar);

      // Converter de volta para o formato FamilyMember para manter compatibilidade
      const memberSaved: FamilyMember = {
        id: familiarSalvo.id,
        name: familiarSalvo.nome,
        relationship: familiarSalvo.parentesco,
        phone: familiarSalvo.telefone,
        email: familiarSalvo.email,
        isEmergencyContact: familiarSalvo.contato_emergencia
      };

      onSave(memberSaved);
    } catch (err) {
      console.error('Erro ao salvar familiar:', err);
      setError(err instanceof Error ? err.message : 'Erro ao salvar familiar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {isEditing ? 'Editar Familiar' : 'Adicionar Familiar'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          {error && (
            <Box sx={{ color: 'error.main', mb: 2 }}>
              {error}
            </Box>
          )}
          <TextField
            fullWidth
            label="Nome Completo"
            name="name"
            value={formData.name}
            onChange={handleChange}
            variant="outlined"
            required
            disabled={loading}
          />
          <TextField
            fullWidth
            label="Parentesco"
            name="relationship"
            value={formData.relationship}
            onChange={handleChange}
            variant="outlined"
            required
            disabled={loading}
          />
          <TextField
            fullWidth
            label="Telefone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            variant="outlined"
            required
            disabled={loading}
          />
          <TextField
            fullWidth
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            variant="outlined"
            disabled={loading}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.isEmergencyContact}
                onChange={handleChange}
                name="isEmergencyContact"
                disabled={loading}
              />
            }
            label="Definir como Contato de Emergência"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancelar</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          color="primary"
          disabled={loading}
        >
          {loading ? 'Salvando...' : 'Salvar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FamilyMemberForm; 