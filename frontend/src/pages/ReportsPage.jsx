import { useEffect, useMemo, useState } from 'react';
import { Typography, Tabs, Tab, Box, Stack, TextField, Button, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import DownloadIcon from '@mui/icons-material/Download';
import DataTable from '../components/DataTable.jsx';
import ListPageLayout from '../components/ListPageLayout.jsx';
import { api } from '../api/client.js';

const REPORTS = [
  {
    key: 'stock-ledger',
    label: 'Stock Ledger',
    department: 'Store',
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
    department: 'Store',
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
    department: 'Store',
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
    department: 'Store',
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
    department: 'Store',
    columns: [
      { field: 'department', headerName: 'Department', minWidth: 200 },
      { field: 'requisition_count', headerName: 'Requisitions', type: 'numericColumn', minWidth: 140 },
      { field: 'total_quantity_issued', headerName: 'Total Qty Issued', type: 'numericColumn', minWidth: 160 },
    ],
  },
  {
    key: 'goods-receipt-register',
    label: 'Goods Receipt Register',
    department: 'Store',
    columns: [
      { field: 'grn_number', headerName: 'GRN No.', minWidth: 130 },
      { field: 'po_number', headerName: 'PO No.', minWidth: 120, valueFormatter: (p) => p.value || '—' },
      { field: 'supplier_name', headerName: 'Supplier', minWidth: 180 },
      { field: 'invoice_number', headerName: 'Invoice No.', minWidth: 130, valueFormatter: (p) => p.value || '—' },
      { field: 'receiver_name', headerName: 'Receiver', minWidth: 140, valueFormatter: (p) => p.value || '—' },
      { field: 'total_quantity_received', headerName: 'Total Qty', type: 'numericColumn', minWidth: 110 },
      { field: 'status', headerName: 'Status', minWidth: 130 },
      { field: 'created_at', headerName: 'Date', minWidth: 160, valueFormatter: (p) => new Date(p.value).toLocaleString() },
    ],
  },
  {
    key: 'material-issue-register',
    label: 'Material Issue Register',
    department: 'Store',
    columns: [
      { field: 'requisition_number', headerName: 'Requisition No.', minWidth: 150 },
      { field: 'department', headerName: 'Department', minWidth: 130 },
      { headerName: 'Item', minWidth: 180, valueGetter: (p) => `${p.data.item_code} — ${p.data.item_name}` },
      { field: 'requested_by', headerName: 'Requested By', minWidth: 140 },
      { field: 'approved_by', headerName: 'Approved By', minWidth: 140, valueFormatter: (p) => p.value || '—' },
      { field: 'quantity_requested', headerName: 'Qty Requested', type: 'numericColumn', minWidth: 130 },
      { field: 'quantity_issued', headerName: 'Qty Issued', type: 'numericColumn', minWidth: 110 },
      { field: 'balance_stock', headerName: 'Balance Stock', type: 'numericColumn', minWidth: 130 },
      { field: 'issue_date', headerName: 'Issue Date', minWidth: 160, valueFormatter: (p) => (p.value ? new Date(p.value).toLocaleString() : '—') },
      { field: 'purpose', headerName: 'Purpose', minWidth: 150, valueFormatter: (p) => p.value || '—' },
    ],
  },
  {
    key: 'inventory-summary',
    label: 'Inventory Summary',
    department: 'Store',
    columns: [
      { field: 'code', headerName: 'Code', minWidth: 100 },
      { field: 'name', headerName: 'Item', minWidth: 180 },
      { field: 'category_name', headerName: 'Category', minWidth: 130, valueFormatter: (p) => p.value || '—' },
      { field: 'warehouse', headerName: 'Warehouse', minWidth: 130, valueFormatter: (p) => p.value || '—' },
      { field: 'quantity', headerName: 'Quantity', type: 'numericColumn', minWidth: 100 },
      { field: 'reserved_stock', headerName: 'Reserved', type: 'numericColumn', minWidth: 100 },
      { field: 'damaged_stock', headerName: 'Damaged', type: 'numericColumn', minWidth: 100 },
      { field: 'rejected_stock', headerName: 'Rejected', type: 'numericColumn', minWidth: 100 },
      { field: 'available_stock', headerName: 'Available', type: 'numericColumn', minWidth: 100 },
      { field: 'reorder_level', headerName: 'Reorder Level', type: 'numericColumn', minWidth: 130 },
      { field: 'unit_rate', headerName: 'Unit Rate', type: 'numericColumn', minWidth: 110, valueFormatter: (p) => `₹ ${Number(p.value).toLocaleString('en-IN')}` },
      { field: 'total_value', headerName: 'Total Value', type: 'numericColumn', minWidth: 130, valueFormatter: (p) => `₹ ${Number(p.value).toLocaleString('en-IN')}` },
    ],
  },
  {
    key: 'rejected-material',
    label: 'Rejected Material',
    department: 'Store',
    columns: [
      { field: 'rejection_number', headerName: 'Rejection No.', minWidth: 140 },
      { headerName: 'Item', minWidth: 180, valueGetter: (p) => `${p.data.item_code} — ${p.data.item_name}` },
      { field: 'supplier_name', headerName: 'Supplier', minWidth: 160, valueFormatter: (p) => p.value || '—' },
      { field: 'batch_number', headerName: 'Batch', minWidth: 110, valueFormatter: (p) => p.value || '—' },
      { field: 'quantity', headerName: 'Qty', type: 'numericColumn', minWidth: 90 },
      { field: 'reason', headerName: 'Reason', minWidth: 180 },
      { field: 'action_taken', headerName: 'Action Taken', minWidth: 150, valueFormatter: (p) => p.value.replace(/_/g, ' ') },
      { field: 'disposal_date', headerName: 'Disposal Date', minWidth: 130, valueFormatter: (p) => (p.value ? new Date(p.value).toLocaleDateString() : '—') },
    ],
  },
  {
    key: 'scrap',
    label: 'Scrap Report',
    department: 'Store',
    columns: [
      { field: 'rejection_number', headerName: 'Rejection No.', minWidth: 140 },
      { headerName: 'Item', minWidth: 180, valueGetter: (p) => `${p.data.item_code} — ${p.data.item_name}` },
      { field: 'supplier_name', headerName: 'Supplier', minWidth: 160, valueFormatter: (p) => p.value || '—' },
      { field: 'batch_number', headerName: 'Batch', minWidth: 110, valueFormatter: (p) => p.value || '—' },
      { field: 'quantity', headerName: 'Qty', type: 'numericColumn', minWidth: 90 },
      { field: 'reason', headerName: 'Reason', minWidth: 200 },
      { field: 'disposal_date', headerName: 'Disposal Date', minWidth: 130, valueFormatter: (p) => (p.value ? new Date(p.value).toLocaleDateString() : '—') },
    ],
  },
  {
    key: 'inventory-audit',
    label: 'Inventory Audit',
    department: 'Store',
    columns: [
      { field: 'changed_at', headerName: 'Date/Time', minWidth: 170, valueFormatter: (p) => new Date(p.value).toLocaleString() },
      { field: 'table_name', headerName: 'Table', minWidth: 110 },
      { headerName: 'Item', minWidth: 160, valueGetter: (p) => (p.data.item_code ? `${p.data.item_code} — ${p.data.item_name}` : `#${p.data.record_id}`) },
      { field: 'field_name', headerName: 'Field', minWidth: 130 },
      { field: 'old_value', headerName: 'Old Value', minWidth: 120, valueFormatter: (p) => p.value ?? '—' },
      { field: 'new_value', headerName: 'New Value', minWidth: 120, valueFormatter: (p) => p.value ?? '—' },
      { field: 'changed_by', headerName: 'Changed By', minWidth: 140 },
    ],
  },
  {
    key: 'vendor-performance',
    label: 'Vendor Performance',
    department: 'Purchase',
    columns: [
      { field: 'supplier_name', headerName: 'Supplier', minWidth: 200 },
      { field: 'vendor_status', headerName: 'Status', minWidth: 130 },
      { field: 'vendor_rating', headerName: 'Rating', type: 'numericColumn', minWidth: 90, valueFormatter: (p) => p.value ?? '—' },
      { field: 'total_pos', headerName: 'Total POs', type: 'numericColumn', minWidth: 100 },
      { field: 'total_value', headerName: 'Total Value', type: 'numericColumn', minWidth: 140, valueFormatter: (p) => `₹ ${Number(p.value).toLocaleString('en-IN')}` },
      { field: 'delivered_count', headerName: 'Delivered', type: 'numericColumn', minWidth: 100 },
      { field: 'on_time_count', headerName: 'On-Time', type: 'numericColumn', minWidth: 100 },
      { field: 'late_count', headerName: 'Late', type: 'numericColumn', minWidth: 90 },
      { field: 'avg_delay_days', headerName: 'Avg Delay (days)', type: 'numericColumn', minWidth: 150, valueFormatter: (p) => p.value ?? '—' },
    ],
  },
  {
    key: 'delivery-delay',
    label: 'Delivery Delay',
    department: 'Purchase',
    columns: [
      { field: 'po_number', headerName: 'PO Number', minWidth: 130 },
      { field: 'supplier_name', headerName: 'Supplier', minWidth: 180 },
      { field: 'department', headerName: 'Department', minWidth: 130, valueFormatter: (p) => p.value || '—' },
      { field: 'status', headerName: 'Status', minWidth: 120 },
      { field: 'expected_delivery_date', headerName: 'Expected', minWidth: 120, valueFormatter: (p) => new Date(p.value).toLocaleDateString() },
      { field: 'actual_delivery_date', headerName: 'Actual', minWidth: 120, valueFormatter: (p) => (p.value ? new Date(p.value).toLocaleDateString() : 'Not yet delivered') },
      { field: 'days_delayed', headerName: 'Days Delayed', type: 'numericColumn', minWidth: 130 },
    ],
  },
];

const DEPARTMENTS = ['Store', 'Purchase'];

// Converts the current report's rows to CSV using the same column set shown on screen
// (headerName label, valueFormatter for readable values) so the export matches the view.
function exportToCsv(report, rows) {
  const escape = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = report.columns.map((c) => c.headerName || c.field).join(',');
  const lines = rows.map((row) =>
    report.columns
      .map((c) => {
        const raw = c.valueGetter ? c.valueGetter({ data: row }) : row[c.field];
        const formatted = c.valueFormatter ? c.valueFormatter({ value: raw, data: row }) : raw;
        return escape(formatted);
      })
      .join(',')
  );
  const csv = [header, ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${report.key}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [department, setDepartment] = useState('Store');
  const departmentReports = useMemo(() => REPORTS.filter((r) => r.department === department), [department]);
  const [reportKey, setReportKey] = useState(departmentReports[0].key);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const active = REPORTS.find((r) => r.key === reportKey) || departmentReports[0];

  useEffect(() => {
    api.get(`/reports/${active.key}`).then((res) => setRows(res.data)).catch(() => setRows([]));
  }, [active.key]);

  const changeDepartment = (dept) => {
    setDepartment(dept);
    setSearch('');
    const firstReport = REPORTS.find((r) => r.department === dept);
    setReportKey(firstReport.key);
  };

  return (
    <ListPageLayout
      header={
        <>
          <Typography variant="h5" gutterBottom>Reports</Typography>
          <Tabs value={department} onChange={(_, v) => changeDepartment(v)} sx={{ minHeight: 36, mb: 0.5 }}>
            {DEPARTMENTS.map((d) => <Tab key={d} value={d} label={d} sx={{ minHeight: 36, py: 0.5 }} />)}
          </Tabs>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={reportKey} onChange={(_, v) => setReportKey(v)} variant="scrollable" scrollButtons="auto">
              {departmentReports.map((r) => <Tab key={r.key} value={r.key} label={r.label} />)}
            </Tabs>
          </Box>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1.5 }}>
            <TextField
              size="small" placeholder="Search this report" value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ width: 280 }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
            />
            <Button size="small" startIcon={<DownloadIcon />} onClick={() => exportToCsv(active, rows)} disabled={!rows.length}>
              Export CSV
            </Button>
          </Stack>
        </>
      }
    >
      <DataTable rowData={rows} columnDefs={active.columns} quickFilterText={search} emptyMessage="No data for this report yet." fillHeight />
    </ListPageLayout>
  );
}
