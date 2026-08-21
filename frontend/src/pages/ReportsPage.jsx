import { useEffect, useState } from 'react';
import { Typography, Tabs, Tab, Box } from '@mui/material';
import DataTable from '../components/DataTable.jsx';
import ListPageLayout from '../components/ListPageLayout.jsx';
import { api } from '../api/client.js';

const REPORTS = [
  {
    key: 'stock-ledger',
    label: 'Stock Ledger',
    columns: [
      { field: 'item_code', headerName: 'Code', minWidth: 100 },
      { field: 'item_name', headerName: 'Item', minWidth: 180 },
      { field: 'type', headerName: 'Type', minWidth: 90 },
      { field: 'quantity', headerName: 'Qty', type: 'numericColumn', minWidth: 90 },
      { field: 'unit', headerName: 'Unit', minWidth: 80 },
      { field: 'reference', headerName: 'Reference', minWidth: 160 },
      { field: 'remarks', headerName: 'Remarks', minWidth: 200 },
      { field: 'created_at', headerName: 'Date', minWidth: 160, valueFormatter: (p) => new Date(p.value).toLocaleString() },
    ],
  },
  {
    key: 'fifo',
    label: 'FIFO Report',
    columns: [
      { field: 'item_code', headerName: 'Code', minWidth: 100 },
      { field: 'item_name', headerName: 'Item', minWidth: 180 },
      { field: 'grn_number', headerName: 'GRN', minWidth: 130 },
      { field: 'batch_number', headerName: 'Batch', minWidth: 130 },
      { field: 'expiry_date', headerName: 'Expiry', minWidth: 110, valueFormatter: (p) => p.value ? new Date(p.value).toLocaleDateString() : '—' },
      { field: 'quantity_received', headerName: 'Qty', type: 'numericColumn', minWidth: 90 },
      { field: 'received_at', headerName: 'Received', minWidth: 160, valueFormatter: (p) => new Date(p.value).toLocaleString() },
    ],
  },
  {
    key: 'batch-wise',
    label: 'Batch-wise Stock',
    columns: [
      { field: 'item_code', headerName: 'Code', minWidth: 100 },
      { field: 'item_name', headerName: 'Item', minWidth: 180 },
      { field: 'batch_number', headerName: 'Batch', minWidth: 130 },
      { field: 'expiry_date', headerName: 'Expiry', minWidth: 110, valueFormatter: (p) => p.value ? new Date(p.value).toLocaleDateString() : '—' },
      { field: 'total_received', headerName: 'Total Received', type: 'numericColumn', minWidth: 140 },
      { field: 'unit', headerName: 'Unit', minWidth: 80 },
    ],
  },
  {
    key: 'supplier-wise-receipts',
    label: 'Supplier-wise Receipts',
    columns: [
      { field: 'supplier_name', headerName: 'Supplier', minWidth: 200 },
      { field: 'grn_count', headerName: 'GRNs', type: 'numericColumn', minWidth: 100 },
      { field: 'total_quantity_received', headerName: 'Total Qty Received', type: 'numericColumn', minWidth: 160 },
      { field: 'last_receipt_at', headerName: 'Last Receipt', minWidth: 160, valueFormatter: (p) => p.value ? new Date(p.value).toLocaleDateString() : '—' },
    ],
  },
  {
    key: 'department-wise-consumption',
    label: 'Department-wise Consumption',
    columns: [
      { field: 'department', headerName: 'Department', minWidth: 200 },
      { field: 'requisition_count', headerName: 'Requisitions', type: 'numericColumn', minWidth: 140 },
      { field: 'total_quantity_issued', headerName: 'Total Qty Issued', type: 'numericColumn', minWidth: 160 },
    ],
  },
];

export default function ReportsPage() {
  const [tab, setTab] = useState(0);
  const [rows, setRows] = useState([]);
  const active = REPORTS[tab];

  useEffect(() => {
    api.get(`/reports/${active.key}`).then((res) => setRows(res.data)).catch(() => setRows([]));
  }, [active.key]);

  return (
    <ListPageLayout
      header={
        <>
          <Typography variant="h5" gutterBottom>Store Reports</Typography>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
              {REPORTS.map((r) => <Tab key={r.key} label={r.label} />)}
            </Tabs>
          </Box>
        </>
      }
    >
      <DataTable rowData={rows} columnDefs={active.columns} emptyMessage="No data for this report yet." fillHeight />
    </ListPageLayout>
  );
}
