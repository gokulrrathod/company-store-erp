import { useEffect, useRef, useState } from 'react';
import { Box, Typography, Button, Stack, List, ListItem, ListItemText, IconButton, Alert } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import { api } from '../api/client.js';

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function AttachmentsPanel({ entityType, entityId, canUpload = true, title = 'Attachments' }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const load = () => {
    if (!entityId) return;
    api.get('/attachments', { params: { entity_type: entityType, entity_id: entityId } })
      .then((res) => setFiles(res.data))
      .catch(() => setFiles([]));
  };

  useEffect(load, [entityType, entityId]);

  const handleDownload = async (file) => {
    setError('');
    try {
      const res = await api.get(`/attachments/${file.id}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.file_name;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Download failed');
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entity_type', entityType);
      formData.append('entity_id', entityId);
      await api.post('/attachments', formData);
      load();
    } catch (err) {
      setError(err?.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="subtitle1" fontWeight={700}>{title}</Typography>
        {canUpload && (
          <Button
            size="small" variant="outlined" component="label"
            startIcon={<UploadFileIcon fontSize="small" />}
            disabled={uploading}
          >
            {uploading ? 'Uploading…' : 'Upload File'}
            <input ref={inputRef} type="file" hidden onChange={handleUpload} />
          </Button>
        )}
      </Stack>
      {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
      {!files.length ? (
        <Typography variant="body2" color="text.secondary">No files attached yet.</Typography>
      ) : (
        <List dense disablePadding>
          {files.map((f) => (
            <ListItem
              key={f.id}
              disableGutters
              secondaryAction={
                <IconButton size="small" onClick={() => handleDownload(f)}>
                  <DownloadIcon fontSize="small" />
                </IconButton>
              }
            >
              <ListItemText
                primary={f.file_name}
                secondary={`${formatSize(f.size_bytes)} · ${f.uploaded_by} · ${new Date(f.uploaded_at).toLocaleString()}`}
                primaryTypographyProps={{ fontSize: '0.875rem' }}
                secondaryTypographyProps={{ fontSize: '0.75rem' }}
              />
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
}
