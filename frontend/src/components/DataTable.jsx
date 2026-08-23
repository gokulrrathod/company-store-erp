import { useMemo, useState, useCallback } from 'react';
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
  minWidth: 110,
};

const AUTO_SIZE_STRATEGY = { type: 'fitCellContents' };

const ROW_HEIGHT = 34;
const HEADER_HEIGHT = 36;
const PAGER_HEIGHT = 48;

export default function DataTable({
  rowData,
  columnDefs,
  pagination = true,
  pageSize = 50,
  minHeight = 140,
  maxHeight = 640,
  fillHeight = false,
  emptyMessage = 'No records found.',
  onRowClicked,
  getRowId,
  quickFilterText,
}) {
  const defaultColDef = useMemo(() => DEFAULT_COL_DEF, []);
  const [displayedRowCount, setDisplayedRowCount] = useState(rowData?.length ?? 0);
  const onModelUpdated = useCallback((params) => {
    setDisplayedRowCount(params.api.getDisplayedRowCount());
  }, []);

  // fillHeight pages get one continuous card that fills the available screen height —
  // the grid itself stays sized to its actual rows (no internal blank gap), and any
  // leftover space renders as plain card background instead of bare page background.
  const cardSx = fillHeight
    ? {
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '10px',
        bgcolor: 'background.paper',
        overflow: 'hidden',
      }
    : undefined;

  if (!rowData || rowData.length === 0) {
    return (
      <Box
        sx={{
          height: fillHeight ? '100%' : 140,
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

  const visibleRows = pagination ? Math.min(displayedRowCount, pageSize) : displayedRowCount;
  const contentHeight = HEADER_HEIGHT + visibleRows * ROW_HEIGHT + (pagination ? PAGER_HEIGHT : 0) + 4;
  const height = Math.min(maxHeight, Math.max(minHeight, contentHeight));

  const grid = (
    <Box
      className="ag-theme-quartz"
      sx={{
        height: fillHeight ? `min(${height}px, 100%)` : height,
        minHeight: fillHeight ? 0 : undefined,
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
        ...(fillHeight ? { '& .ag-root-wrapper': { border: 'none' } } : {}),
      }}
    >
      <AgGridReact
        rowData={rowData}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        autoSizeStrategy={AUTO_SIZE_STRATEGY}
        pagination={pagination}
        paginationPageSize={pageSize}
        paginationPageSizeSelector={[20, 50, 100, 200]}
        animateRows
        onModelUpdated={onModelUpdated}
        onRowClicked={onRowClicked}
        getRowId={getRowId}
        quickFilterText={quickFilterText}
        rowSelection={onRowClicked ? { mode: 'singleRow' } : undefined}
      />
    </Box>
  );

  return fillHeight ? <Box sx={cardSx}>{grid}</Box> : grid;
}
