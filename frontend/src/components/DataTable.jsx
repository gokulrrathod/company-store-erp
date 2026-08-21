import { useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, ClientSideRowModelModule } from 'ag-grid-community';
import { Box, Typography } from '@mui/material';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

ModuleRegistry.registerModules([ClientSideRowModelModule]);

const DEFAULT_COL_DEF = {
  sortable: true,
  filter: false,
  suppressMenu: true,
  resizable: true,
  flex: 1,
  minWidth: 110,
};

const ROW_HEIGHT = 34;
const HEADER_HEIGHT = 36;
const PAGER_HEIGHT = 48;

export default function DataTable({
  rowData,
  columnDefs,
  pagination = true,
  pageSize = 50,
  minHeight = 520,
  emptyMessage = 'No records found.',
  onRowClicked,
  getRowId,
  quickFilterText,
}) {
  const defaultColDef = useMemo(() => DEFAULT_COL_DEF, []);

  if (!rowData || rowData.length === 0) {
    return (
      <Box
        sx={{
          height: 140,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          bgcolor: 'background.paper',
        }}
      >
        <Typography variant="body2" color="text.secondary">{emptyMessage}</Typography>
      </Box>
    );
  }

  // Grid always sizes to exactly fit its own rows (never its own inner
  // scrollbar — the page scrolls for overflow instead), but never shrinks
  // below `minHeight` either, so a short list still fills the screen
  // instead of leaving a tiny cramped table with dead space beneath it.
  const visibleRows = pagination ? Math.min(rowData.length, pageSize) : rowData.length;
  const contentHeight = HEADER_HEIGHT + visibleRows * ROW_HEIGHT + (pagination ? PAGER_HEIGHT : 0) + 4;
  const height = Math.max(minHeight, contentHeight);

  return (
    <Box
      className="ag-theme-quartz"
      sx={{
        height,
        width: '100%',
        '--ag-active-color': '#4F46E5',
        '--ag-selected-row-background-color': '#EEF2FF',
        '--ag-row-hover-color': '#F5F5FF',
        '--ag-header-background-color': '#F8FAFC',
        '--ag-header-foreground-color': '#1E293B',
        '--ag-font-family': 'inherit',
        '--ag-font-size': '0.8125rem',
        '--ag-border-color': '#E2E8F0',
        '--ag-border-radius': '10px',
        '--ag-row-height': `${ROW_HEIGHT}px`,
        '--ag-header-height': `${HEADER_HEIGHT}px`,
      }}
    >
      <AgGridReact
        rowData={rowData}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        pagination={pagination}
        paginationPageSize={pageSize}
        paginationPageSizeSelector={[20, 50, 100, 200]}
        animateRows
        onRowClicked={onRowClicked}
        getRowId={getRowId}
        quickFilterText={quickFilterText}
        rowSelection={onRowClicked ? { mode: 'singleRow' } : undefined}
      />
    </Box>
  );
}
