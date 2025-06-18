import React, { useState } from 'react';
import {
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Typography,
  Box,
  Paper,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonIcon from '@mui/icons-material/Person';
import { FamilyMember } from '../pages/familiares/FamilyMemberDialog';

interface FamilyMemberListProps {
  familyMembers: FamilyMember[];
  onEdit: (member: FamilyMember) => void;
  onDelete: (member: FamilyMember) => void;
}

interface ConfirmDeleteDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  memberName: string;
}

const ConfirmDeleteDialog: React.FC<ConfirmDeleteDialogProps> = ({
  open,
  onClose,
  onConfirm,
  memberName
}) => (
  <Dialog open={open} onClose={onClose}>
    <DialogTitle component="div">Confirmar Exclusão</DialogTitle>
    <DialogContent>
      <Box component="p" sx={{ typography: 'body1' }}>
        Tem certeza que deseja excluir o familiar {memberName}?
      </Box>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Cancelar</Button>
      <Button onClick={onConfirm} color="error">
        Excluir
      </Button>
    </DialogActions>
  </Dialog>
);

const FamilyMemberList: React.FC<FamilyMemberListProps> = ({
  familyMembers,
  onEdit,
  onDelete
}) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);

  const handleDeleteClick = (member: FamilyMember) => {
    setSelectedMember(member);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (selectedMember) {
      onDelete(selectedMember);
      setDeleteDialogOpen(false);
      setSelectedMember(null);
    }
  };

  const handleCloseDialog = () => {
    setDeleteDialogOpen(false);
    setSelectedMember(null);
  };

  if (familyMembers.length === 0) {
    return (
      <Paper elevation={0} sx={{ p: 3, textAlign: 'center', bgcolor: 'grey.50' }}>
        <Typography variant="body1" color="text.secondary">
          Nenhum familiar cadastrado ainda.
        </Typography>
      </Paper>
    );
  }

  return (
    <>
      <List>
        {familyMembers.map((member, index) => (
          <React.Fragment key={member.id}>
            <ListItem
              sx={{
                bgcolor: 'background.paper',
                mb: 1,
                borderRadius: 1,
                '&:hover': { bgcolor: 'grey.50' },
              }}
            >
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: member.isEmergencyContact ? 'error.main' : 'primary.main' }}>
                  <PersonIcon />
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Typography variant="subtitle1" component="span" sx={{ fontWeight: 'bold' }}>
                    {member.name}
                  </Typography>
                }
                secondary={
                  <>
                    <Typography variant="body2" component="span" display="block">
                      {member.relationship}
                    </Typography>
                    {member.phone && (
                      <Typography variant="body2" component="span" display="block">
                        {member.phone}
                      </Typography>
                    )}
                    {member.email && (
                      <Typography variant="body2" component="span" display="block">
                        {member.email}
                      </Typography>
                    )}
                    {member.isEmergencyContact && (
                      <Typography
                        variant="body2"
                        component="span"
                        color="error"
                        sx={{ mt: 0.5, display: 'block' }}
                      >
                        Contato de Emergência
                      </Typography>
                    )}
                  </>
                }
              />
              <ListItemSecondaryAction>
                <IconButton 
                  edge="end" 
                  onClick={() => onEdit(member)} 
                  sx={{ mr: 1 }}
                  aria-label="Editar familiar"
                >
                  <EditIcon />
                </IconButton>
                <IconButton 
                  edge="end" 
                  onClick={() => handleDeleteClick(member)}
                  aria-label="Remover familiar"
                >
                  <DeleteIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
            {index < familyMembers.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </List>

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onClose={handleCloseDialog}
        onConfirm={handleConfirmDelete}
        memberName={selectedMember?.name || ''}
      />
    </>
  );
};

export default FamilyMemberList; 
