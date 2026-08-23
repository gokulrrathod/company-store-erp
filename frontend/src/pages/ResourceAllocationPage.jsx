import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Box, Typography, Chip, Button, Stack, Alert, Paper,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DataTable from '../components/DataTable.jsx';
import RHFTextField from '../components/form/RHFTextField.jsx';
import RHFSelect from '../components/form/RHFSelect.jsx';
import {
  machineSchema, labourSchema, machineAllocationSchema, manpowerAllocationSchema, spaceAllocationSchema,
} from '../validation/schemas.js';
import { applyServerErrors } from '../utils/applyServerErrors.js';
import { api } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';

const SPACE_OPTIONS = [
  { value: 'FABRICATION_BAY', label: 'Fabrication Bay' },
  { value: 'PAINTING_BAY', label: 'Painting Bay' },
  { value: 'ASSEMBLY_AREA', label: 'Assembly Area' },
];
const availabilityColor = { AVAILABLE: 'success', ALLOCATED: 'warning', MAINTENANCE: 'error' };

function Section({ title, children }) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, mt: 2 }}>
      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>{title}</Typography>
      {children}
    </Paper>
  );
}

export default function ResourceAllocationPage() {
  const { user } = useAuth();
  const [machines, setMachines] = useState([]);
  const [labour, setLabour] = useState([]);
  const [allocations, setAllocations] = useState({ machine_allocations: [], manpower_allocations: [], space_allocations: [] });
  const [actionError, setActionError] = useState('');

  const [machineOpen, setMachineOpen] = useState(false);
  const [labourOpen, setLabourOpen] = useState(false);
  const [machineAllocOpen, setMachineAllocOpen] = useState(false);
  const [manpowerAllocOpen, setManpowerAllocOpen] = useState(false);
  const [spaceAllocOpen, setSpaceAllocOpen] = useState(false);

  const canManage = ['PRODUCTION', 'PRODUCTION_HEAD', 'ADMIN'].includes(user?.role);

  const load = () => {
    api.get('/machines').then((res) => setMachines(res.data)).catch(() => setMachines([]));
    api.get('/labour').then((res) => setLabour(res.data)).catch(() => setLabour([]));
    api.get('/production/resource-allocations').then((res) => setAllocations(res.data)).catch(() => {});
  };

  useEffect(load, []);

  const machineForm = useForm({ resolver: zodResolver(machineSchema), defaultValues: { machine_name: '', machine_number: '', machine_type: '' } });
  const labourForm = useForm({ resolver: zodResolver(labourSchema), defaultValues: { employee_name: '', department: '', skill: '' } });
  const machineAllocForm = useForm({
    resolver: zodResolver(machineAllocationSchema),
    defaultValues: { machine_id: '', project_reference: '', allocated_from: new Date().toISOString().slice(0, 10), allocated_to: '' },
  });
  const manpowerAllocForm = useForm({
    resolver: zodResolver(manpowerAllocationSchema),
    defaultValues: { labour_id: '', project_reference: '', shift: '', assigned_job: '', allocated_from: new Date().toISOString().slice(0, 10), allocated_to: '' },
  });
  const spaceAllocForm = useForm({
    resolver: zodResolver(spaceAllocationSchema),
    defaultValues: { space_name: '', project_reference: '', allocated_from: new Date().toISOString().slice(0, 10), allocated_to: '' },
  });

  const addMachine = async (values) => {
    setActionError('');
    try {
      await api.post('/machines', values);
      setMachineOpen(false);
      machineForm.reset({ machine_name: '', machine_number: '', machine_type: '' });
      load();
    } catch (err) {
      applyServerErrors(err, machineForm.setError, setActionError);
    }
  };

  const addLabour = async (values) => {
    setActionError('');
    try {
      await api.post('/labour', values);
      setLabourOpen(false);
      labourForm.reset({ employee_name: '', department: '', skill: '' });
      load();
    } catch (err) {
      applyServerErrors(err, labourForm.setError, setActionError);
    }
  };

  const addMachineAllocation = async (values) => {
    setActionError('');
    try {
      await api.post('/production/machine-allocations', values);
      setMachineAllocOpen(false);
      machineAllocForm.reset({ machine_id: '', project_reference: '', allocated_from: new Date().toISOString().slice(0, 10), allocated_to: '' });
      load();
    } catch (err) {
      applyServerErrors(err, machineAllocForm.setError, setActionError);
    }
  };

  const releaseMachineAllocation = async (allocationId) => {
    setActionError('');
    try {
      await api.patch(`/production/machine-allocations/${allocationId}/release`);
      load();
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to release machine');
    }
  };

  const addManpowerAllocation = async (values) => {
    setActionError('');
    try {
      await api.post('/production/manpower-allocations', values);
      setManpowerAllocOpen(false);
      manpowerAllocForm.reset({ labour_id: '', project_reference: '', shift: '', assigned_job: '', allocated_from: new Date().toISOString().slice(0, 10), allocated_to: '' });
      load();
    } catch (err) {
      applyServerErrors(err, manpowerAllocForm.setError, setActionError);
    }
  };

  const addSpaceAllocation = async (values) => {
    setActionError('');
    try {
      await api.post('/production/space-allocations', values);
      setSpaceAllocOpen(false);
      spaceAllocForm.reset({ space_name: '', project_reference: '', allocated_from: new Date().toISOString().slice(0, 10), allocated_to: '' });
      load();
    } catch (err) {
      applyServerErrors(err, spaceAllocForm.setError, setActionError);
    }
  };

  const machineColumnDefs = [
    { field: 'machine_name', headerName: 'Machine Name', minWidth: 160 },
    { field: 'machine_number', headerName: 'Machine No.', minWidth: 130 },
    { field: 'machine_type', headerName: 'Type', minWidth: 120, valueFormatter: (p) => p.value || '—' },
    { field: 'availability_status', headerName: 'Availability', minWidth: 130, cellRenderer: (p) => <Chip size="small" label={p.value} color={availabilityColor[p.value]} /> },
  ];

  const labourColumnDefs = [
    { field: 'employee_name', headerName: 'Employee', minWidth: 160 },
    { field: 'department', headerName: 'Department', minWidth: 140 },
    { field: 'skill', headerName: 'Skill', minWidth: 140, valueFormatter: (p) => p.value || '—' },
  ];

  const machineAllocColumnDefs = [
    {
      field: 'machine_name',
      headerName: 'Machine',
      minWidth: 170,
      cellRenderer: (p) => (
        <div style={{ lineHeight: 1.35, padding: '6px 0' }}>
          <div style={{ fontWeight: 600 }}>{p.data.machine_name}</div>
          <div style={{ fontSize: '0.72rem', color: '#64748B' }}>{p.data.machine_number}</div>
        </div>
      ),
    },
    { field: 'project_reference', headerName: 'Project', minWidth: 160 },
    { field: 'allocated_from', headerName: 'From', minWidth: 110, valueFormatter: (p) => new Date(p.value).toLocaleDateString() },
    { field: 'allocated_to', headerName: 'To', minWidth: 110, valueFormatter: (p) => (p.value ? new Date(p.value).toLocaleDateString() : '—') },
    { field: 'allocated_by', headerName: 'Allocated By', minWidth: 140 },
    {
      headerName: 'Status', minWidth: 110,
      cellRenderer: (p) => <Chip size="small" label={p.data.released_at ? 'Released' : 'Active'} color={p.data.released_at ? 'default' : 'warning'} />,
    },
    ...(canManage
      ? [{
          headerName: 'Actions', minWidth: 110, sortable: false, filter: false,
          cellRenderer: (p) => (!p.data.released_at ? <Button size="small" onClick={() => releaseMachineAllocation(p.data.id)}>Release</Button> : null),
        }]
      : []),
  ];

  const manpowerAllocColumnDefs = [
    { field: 'employee_name', headerName: 'Employee', minWidth: 150 },
    { field: 'labour_department', headerName: 'Department', minWidth: 130 },
    { field: 'project_reference', headerName: 'Project', minWidth: 160 },
    { field: 'shift', headerName: 'Shift', minWidth: 100 },
    { field: 'assigned_job', headerName: 'Assigned Job', minWidth: 150 },
    { field: 'allocated_from', headerName: 'From', minWidth: 110, valueFormatter: (p) => new Date(p.value).toLocaleDateString() },
    { field: 'allocated_to', headerName: 'To', minWidth: 110, valueFormatter: (p) => (p.value ? new Date(p.value).toLocaleDateString() : '—') },
  ];

  const spaceAllocColumnDefs = [
    { field: 'space_name', headerName: 'Space', minWidth: 150, valueFormatter: (p) => p.value.replace(/_/g, ' ') },
    { field: 'project_reference', headerName: 'Project', minWidth: 160 },
    { field: 'allocated_from', headerName: 'From', minWidth: 110, valueFormatter: (p) => new Date(p.value).toLocaleDateString() },
    { field: 'allocated_to', headerName: 'To', minWidth: 110, valueFormatter: (p) => (p.value ? new Date(p.value).toLocaleDateString() : '—') },
    { field: 'allocated_by', headerName: 'Allocated By', minWidth: 140 },
  ];

  return (
    <Box sx={{ maxWidth: 1100 }}>
      <Typography variant="h5" fontWeight={700}>Resource Allocation</Typography>
      {actionError && <Alert severity="error" sx={{ mt: 2 }}>{actionError}</Alert>}

      <Section title="Machinery Master">
        <DataTable rowData={machines} columnDefs={machineColumnDefs} pagination={false} height={Math.max(160, machines.length * 56 + 60)} getRowId={(p) => String(p.data.id)} emptyMessage="No machines registered yet." />
        {canManage && <Button startIcon={<AddIcon />} sx={{ mt: 1.5 }} onClick={() => setMachineOpen(true)}>Add Machine</Button>}
      </Section>

      <Section title="Labour Master">
        <DataTable rowData={labour} columnDefs={labourColumnDefs} pagination={false} height={Math.max(160, labour.length * 56 + 60)} getRowId={(p) => String(p.data.id)} emptyMessage="No employees registered yet." />
        {canManage && <Button startIcon={<AddIcon />} sx={{ mt: 1.5 }} onClick={() => setLabourOpen(true)}>Add Employee</Button>}
      </Section>

      <Section title="Machine Allocations">
        <DataTable rowData={allocations.machine_allocations} columnDefs={machineAllocColumnDefs} pagination={false} rowHeight={44} height={Math.max(160, allocations.machine_allocations.length * 56 + 60)} getRowId={(p) => String(p.data.id)} emptyMessage="No machine allocations yet." />
        {canManage && <Button startIcon={<AddIcon />} sx={{ mt: 1.5 }} onClick={() => setMachineAllocOpen(true)}>Allocate Machine</Button>}
      </Section>

      <Section title="Manpower Allocations">
        <DataTable rowData={allocations.manpower_allocations} columnDefs={manpowerAllocColumnDefs} pagination={false} height={Math.max(160, allocations.manpower_allocations.length * 56 + 60)} getRowId={(p) => String(p.data.id)} emptyMessage="No manpower allocations yet." />
        {canManage && <Button startIcon={<AddIcon />} sx={{ mt: 1.5 }} onClick={() => setManpowerAllocOpen(true)}>Allocate Employee</Button>}
      </Section>

      <Section title="Space Allocations">
        <DataTable rowData={allocations.space_allocations} columnDefs={spaceAllocColumnDefs} pagination={false} height={Math.max(160, allocations.space_allocations.length * 56 + 60)} getRowId={(p) => String(p.data.id)} emptyMessage="No space allocations yet." />
        {canManage && <Button startIcon={<AddIcon />} sx={{ mt: 1.5 }} onClick={() => setSpaceAllocOpen(true)}>Allocate Space</Button>}
      </Section>

      <Dialog open={machineOpen} onClose={() => setMachineOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add Machine</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <RHFTextField name="machine_name" control={machineForm.control} label="Machine Name" required />
            <RHFTextField name="machine_number" control={machineForm.control} label="Machine Number" required />
            <RHFTextField name="machine_type" control={machineForm.control} label="Machine Type" />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMachineOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={machineForm.handleSubmit(addMachine)}>Add</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={labourOpen} onClose={() => setLabourOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add Employee</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <RHFTextField name="employee_name" control={labourForm.control} label="Employee Name" required />
            <RHFTextField name="department" control={labourForm.control} label="Department" required />
            <RHFTextField name="skill" control={labourForm.control} label="Skill" />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLabourOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={labourForm.handleSubmit(addLabour)}>Add</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={machineAllocOpen} onClose={() => setMachineAllocOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Allocate Machine</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <RHFSelect name="machine_id" control={machineAllocForm.control} label="Machine" required options={machines.filter((m) => m.availability_status === 'AVAILABLE')} getLabel={(m) => `${m.machine_name} (${m.machine_number})`} getValue={(m) => m.id} />
            <RHFTextField name="project_reference" control={machineAllocForm.control} label="Project Reference" required />
            <RHFTextField name="allocated_from" control={machineAllocForm.control} label="Allocated From" type="date" required InputLabelProps={{ shrink: true }} />
            <RHFTextField name="allocated_to" control={machineAllocForm.control} label="Allocated To (optional)" type="date" InputLabelProps={{ shrink: true }} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMachineAllocOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={machineAllocForm.handleSubmit(addMachineAllocation)}>Allocate</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={manpowerAllocOpen} onClose={() => setManpowerAllocOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Allocate Employee</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <RHFSelect name="labour_id" control={manpowerAllocForm.control} label="Employee" required options={labour} getLabel={(l) => `${l.employee_name} (${l.department})`} getValue={(l) => l.id} />
            <RHFTextField name="project_reference" control={manpowerAllocForm.control} label="Project Reference" required />
            <RHFTextField name="shift" control={manpowerAllocForm.control} label="Shift" required />
            <RHFTextField name="assigned_job" control={manpowerAllocForm.control} label="Assigned Job" required />
            <RHFTextField name="allocated_from" control={manpowerAllocForm.control} label="Allocated From" type="date" required InputLabelProps={{ shrink: true }} />
            <RHFTextField name="allocated_to" control={manpowerAllocForm.control} label="Allocated To (optional)" type="date" InputLabelProps={{ shrink: true }} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setManpowerAllocOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={manpowerAllocForm.handleSubmit(addManpowerAllocation)}>Allocate</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={spaceAllocOpen} onClose={() => setSpaceAllocOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Allocate Space</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <RHFSelect name="space_name" control={spaceAllocForm.control} label="Space" required options={SPACE_OPTIONS} getLabel={(s) => s.label} getValue={(s) => s.value} />
            <RHFTextField name="project_reference" control={spaceAllocForm.control} label="Project Reference" required />
            <RHFTextField name="allocated_from" control={spaceAllocForm.control} label="Allocated From" type="date" required InputLabelProps={{ shrink: true }} />
            <RHFTextField name="allocated_to" control={spaceAllocForm.control} label="Allocated To (optional)" type="date" InputLabelProps={{ shrink: true }} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSpaceAllocOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={spaceAllocForm.handleSubmit(addSpaceAllocation)}>Allocate</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
