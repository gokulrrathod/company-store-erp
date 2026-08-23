import { useEffect, useState } from 'react';
import { Box, Typography, TextField, MenuItem } from '@mui/material';
import DataTable from '../components/DataTable.jsx';
import ListPageLayout from '../components/ListPageLayout.jsx';
import { api } from '../api/client.js';

export default function AuditLogPage() {
  const [entries, setEntries] = useState([]);
  const [tables, setTables] = useState([]);
  const [tableFilter, setTableFilter] = useState('');
  const [recordFilter, setRecordFilter] = useState('');

  useEffect(() => {
    api.get('/audit-log/tables').then((res) => setTables(res.data)).catch(() => setTables([]));
  }, []);

  useEffect(() => {
    const params = {};
    if (tableFilter) params.table_name = tableFilter;
    if (recordFilter) params.record_id = recordFilter;
    api.get('/audit-log', { params }).then((res) => setEntries(res.data)).catch(() => setEntries([]));
  }, [tableFilter, recordFilter]);

  const columnDefs = [
    { field: 'changed_at', headerName: 'When', minWidth: 170, valueFormatter: (p) => new Date(p.value).toLocaleString() },
    {
      field: 'table_name',
      headerName: 'Record',
      minWidth: 170,
      cellRenderer: (p) => (
        <div style={{ lineHeight: 1.35, padding: '6px 0' }}>
          <div style={{ fontWeight: 600 }}>{p.data.table_name}</div>
          <div style={{ fontSize: '0.72rem', color: '#64748B' }}>#{p.data.record_id}</div>
        </div>
      ),
    },
    { field: 'field_name', headerName: 'Field', minWidth: 150 },
    {
      field: 'new_value',
      headerName: 'Change',
      minWidth: 220,
      wrapText: true,
      autoHeight: true,
      cellRenderer: (p) => (
        <div style={{ lineHeight: 1.35, padding: '6px 0' }}>
          <div style={{ fontSize: '0.72rem', color: '#64748B' }}>was: {p.data.old_value ?? '—'}</div>
          <div style={{ fontWeight: 600 }}>{p.data.new_value ?? '—'}</div>
        </div>
      ),
    },
    { field: 'changed_by', headerName: 'Changed By', minWidth: 150, pinned: 'right' },
  ];

  return (
    <ListPageLayout
      header={
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
          <Typography variant="h5">Audit Trail</Typography>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <TextField select size="small" label="Table" value={tableFilter} onChange={(e) => setTableFilter(e.target.value)} sx={{ width: 200 }}>
              <MenuItem value="">All tables</MenuItem>
              {tables.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </TextField>
            <TextField size="small" label="Record ID" value={recordFilter} onChange={(e) => setRecordFilter(e.target.value)} sx={{ width: 140 }} />
          </Box>
        </Box>
      }
    >
      <DataTable
        rowData={entries}
        columnDefs={columnDefs}
        getRowId={(p) => String(p.data.id)}
        emptyMessage="No audit entries yet — they appear as soon as any tracked record is edited."
        rowHeight={48}
        fillHeight
      />
    </ListPageLayout>
  );
}
