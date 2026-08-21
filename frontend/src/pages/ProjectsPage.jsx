import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Typography, Chip, Button, Dialog, DialogTitle, DialogContent, DialogActions, Stack, Alert, IconButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useNavigate } from 'react-router-dom';
import DataTable from '../components/DataTable.jsx';
import RHFTextField from '../components/form/RHFTextField.jsx';
import RHFSelect from '../components/form/RHFSelect.jsx';
import { projectSchema } from '../validation/schemas.js';
import { applyServerErrors } from '../utils/applyServerErrors.js';
import { api } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';

const COMPANIES = [
  { value: 'VMG_BARAMATI', label: 'VMG Baramati Industries Pvt. Ltd.' },
  { value: 'VMG_SUGAR_LLP', label: 'VMG Sugar LLP' },
];
const statusColor = { PLANNING: 'default', RUNNING: 'warning', HOLD: 'error', COMPLETED: 'success', CLOSED: 'success' };

export default function ProjectsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState('');

  const {
    control, handleSubmit, reset, setError,
    formState: { isSubmitting },
  } = useForm({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      project_name: '', client_name: '', site_location: '', company: 'VMG_BARAMATI', project_type: '',
      start_date: '', expected_completion_date: '', project_value: '', project_manager: user?.name || '', site_engineer: '',
    },
  });

  const load = () => {
    api.get('/projects').then((res) => setProjects(res.data)).catch(() => setProjects([]));
  };

  useEffect(load, []);

  const openDialog = () => {
    setFormError('');
    reset({ project_name: '', client_name: '', site_location: '', company: 'VMG_BARAMATI', project_type: '', start_date: '', expected_completion_date: '', project_value: '', project_manager: user?.name || '', site_engineer: '' });
    setOpen(true);
  };

  const onSubmit = async (values) => {
    setFormError('');
    try {
      await api.post('/projects', values);
      setOpen(false);
      load();
    } catch (err) {
      applyServerErrors(err, setError, setFormError);
    }
  };

  const canCreate = ['PROJECT_MANAGER', 'ADMIN'].includes(user?.role);

  const columnDefs = [
    { field: 'project_name', headerName: 'Project Name', minWidth: 180 },
    { field: 'client_name', headerName: 'Client', minWidth: 160 },
    { field: 'company', headerName: 'Company', minWidth: 180, valueFormatter: (p) => p.value === 'VMG_BARAMATI' ? 'VMG Baramati' : 'VMG Sugar LLP' },
    { field: 'project_value', headerName: 'Value', type: 'numericColumn', minWidth: 120, valueFormatter: (p) => `₹ ${Number(p.value).toLocaleString('en-IN')}` },
    { field: 'project_manager', headerName: 'Manager', minWidth: 150 },
    {
      field: 'status',
      headerName: 'Status',
      minWidth: 120,
      cellRenderer: (p) => <Chip size="small" label={p.value} color={statusColor[p.value]} />,
    },
    {
      headerName: 'View',
      minWidth: 70,
      flex: 0,
      sortable: false,
      filter: false,
      cellRenderer: (p) => (
        <IconButton size="small" onClick={() => navigate(`/projects/${p.data.id}`)}>
          <VisibilityIcon fontSize="small" />
        </IconButton>
      ),
    },
  ];

  return (
    <>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5">Projects</Typography>
        {canCreate && (
          <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={openDialog}>
            New Project
          </Button>
        )}
      </Stack>

      <DataTable rowData={projects} columnDefs={columnDefs} getRowId={(p) => String(p.data.id)} />

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>New Project</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <RHFTextField name="project_name" control={control} label="Project Name" required />
            <RHFTextField name="client_name" control={control} label="Client Name" required />
            <RHFTextField name="site_location" control={control} label="Site Location" />
            <RHFSelect name="company" control={control} label="Company" required options={COMPANIES} getLabel={(c) => c.label} getValue={(c) => c.value} />
            <RHFTextField name="project_type" control={control} label="Project Type" />
            <RHFTextField name="start_date" control={control} label="Start Date" type="date" InputLabelProps={{ shrink: true }} />
            <RHFTextField name="expected_completion_date" control={control} label="Expected Completion Date" type="date" InputLabelProps={{ shrink: true }} />
            <RHFTextField name="project_value" control={control} label="Project Value (₹)" type="number" />
            <RHFTextField name="project_manager" control={control} label="Project Manager" required />
            <RHFTextField name="site_engineer" control={control} label="Site Engineer" />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" color="primary" onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>Create</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
