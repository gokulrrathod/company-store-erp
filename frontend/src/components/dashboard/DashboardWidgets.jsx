import { Paper, Typography, Box, Stack } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

export const CHART_COLORS = ['#4F46E5', '#6366F1', '#0D9488', '#D97706', '#E11D48', '#0891B2', '#7C3AED'];

export function buildConicGradient(items) {
  let cursor = 0;
  const stops = items.map((it, idx) => {
    const start = cursor;
    cursor += it.percent;
    return `${CHART_COLORS[idx % CHART_COLORS.length]} ${start}% ${cursor}%`;
  });
  return stops.length ? `conic-gradient(${stops.join(', ')})` : '#E2E8F0';
}

export function ClickableCard({ onClick, hint, children, sx }) {
  return (
    <Paper
      variant="outlined"
      onClick={onClick}
      sx={{
        p: 2.5, position: 'relative', cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow .15s ease, transform .15s ease, border-color .15s ease',
        '&:hover': onClick ? { boxShadow: '0 8px 24px rgba(79,70,229,0.14)', transform: 'translateY(-2px)', borderColor: 'primary.light', '& .hover-hint': { opacity: 1 } } : {},
        ...sx,
      }}
    >
      {onClick && hint && (
        <Typography className="hover-hint" variant="caption" sx={{ position: 'absolute', top: 12, right: 14, color: 'primary.main', fontWeight: 700, opacity: 0, transition: 'opacity .15s ease', display: 'flex', alignItems: 'center', gap: 0.3 }}>
          {hint} <ArrowForwardIcon sx={{ fontSize: 13 }} />
        </Typography>
      )}
      {children}
    </Paper>
  );
}

export function StatCard({ icon, label, value, sub, color, onClick, hint }) {
  return (
    <ClickableCard onClick={onClick} hint={hint} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 700 }}>{label}</Typography>
        <Typography variant="h5" fontWeight={700} sx={{ mt: 0.5 }}>{value}</Typography>
        {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
      </Box>
      <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: `${color}.50`, color: `${color}.main`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </Box>
    </ClickableCard>
  );
}

export function ChartHeading({ children }) {
  return (
    <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: 'text.secondary' }}>
      {children}
    </Typography>
  );
}

// Simple horizontal bar list — e.g. "Low Stock by Category", "Top Suppliers by Value".
export function BarListChart({ heading, hint, onClick, data, valueLabel = (d) => d.value, barColor = 'warning' }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ClickableCard onClick={onClick} hint={hint}>
      <ChartHeading>{heading}</ChartHeading>
      <Stack spacing={1.2} sx={{ mt: 1.5 }}>
        {data.length === 0 && <Typography variant="body2" color="text.secondary">Nothing to show yet.</Typography>}
        {data.map((d, idx) => (
          <Box key={d.label} sx={{ display: 'grid', gridTemplateColumns: '110px 1fr auto', alignItems: 'center', gap: 1.2 }}>
            <Typography variant="body2" color="text.secondary" noWrap>{d.label}</Typography>
            <Box sx={{ height: 10, borderRadius: 1, bgcolor: 'background.default', overflow: 'hidden' }}>
              <Box sx={{ height: '100%', width: `${(d.value / max) * 100}%`, borderRadius: 1, bgcolor: idx === 0 ? `${barColor}.main` : `${barColor}.light` }} />
            </Box>
            <Typography variant="body2" fontWeight={700} textAlign="right" noWrap>{valueLabel(d)}</Typography>
          </Box>
        ))}
      </Stack>
    </ClickableCard>
  );
}

// Bar list where each row shows progress toward a target — e.g. Budget Utilization (used / allocated).
export function RatioBarChart({ heading, hint, onClick, data }) {
  return (
    <ClickableCard onClick={onClick} hint={hint}>
      <ChartHeading>{heading}</ChartHeading>
      <Stack spacing={1.4} sx={{ mt: 1.5 }}>
        {data.length === 0 && <Typography variant="body2" color="text.secondary">No budgets allocated yet.</Typography>}
        {data.map((d) => {
          const pct = d.total > 0 ? Math.min(100, Math.round((d.used / d.total) * 100)) : 0;
          return (
            <Box key={d.label}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.4 }}>
                <Typography variant="body2" color="text.secondary">{d.label}</Typography>
                <Typography variant="caption" fontWeight={700} color={pct >= 90 ? 'error.main' : 'text.secondary'}>
                  ₹{d.used.toLocaleString('en-IN')} / ₹{d.total.toLocaleString('en-IN')}
                </Typography>
              </Box>
              <Box sx={{ height: 8, borderRadius: 1, bgcolor: 'background.default', overflow: 'hidden' }}>
                <Box sx={{ height: '100%', width: `${pct}%`, borderRadius: 1, bgcolor: pct >= 90 ? 'error.main' : 'primary.main' }} />
              </Box>
            </Box>
          );
        })}
      </Stack>
    </ClickableCard>
  );
}

export function DonutChart({ heading, hint, onClick, items, centerValue, centerLabel }) {
  const total = items.reduce((s, i) => s + i.value, 0) || 1;
  const withPercent = items.map((i) => ({ ...i, percent: (i.value / total) * 100 }));
  return (
    <ClickableCard onClick={onClick} hint={hint}>
      <ChartHeading>{heading}</ChartHeading>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.2, mt: 1.5 }}>
        <Box sx={{
          width: 108, height: 108, borderRadius: '50%', flexShrink: 0, position: 'relative',
          background: buildConicGradient(withPercent),
        }}>
          <Box sx={{ position: 'absolute', inset: 16, borderRadius: '50%', bgcolor: 'background.paper', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1 }}>{centerValue}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>{centerLabel}</Typography>
          </Box>
        </Box>
        <Stack spacing={0.8} sx={{ minWidth: 0, flex: 1 }}>
          {withPercent.map((it, idx) => (
            <Box key={it.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
              <Box sx={{ width: 9, height: 9, borderRadius: 0.6, flexShrink: 0, bgcolor: CHART_COLORS[idx % CHART_COLORS.length] }} />
              <Typography variant="body2" color="text.secondary" noWrap sx={{ flex: 1 }}>{it.label}</Typography>
              <Typography variant="body2" fontWeight={700}>{it.display ?? Math.round(it.percent) + '%'}</Typography>
            </Box>
          ))}
        </Stack>
      </Box>
    </ClickableCard>
  );
}

export function TrendChart({ heading, hint, onClick, data, seriesA, seriesB, valueLabel }) {
  const w = 300, h = 70;
  const maxVal = Math.max(1, ...data.flatMap((d) => [d[seriesA.key], d[seriesB.key]]));
  const step = data.length > 1 ? w / (data.length - 1) : w;
  const toPoints = (key) => data.map((d, i) => `${i * step},${h - (d[key] / maxVal) * (h - 8) - 4}`).join(' ');
  const latest = data[data.length - 1] || { [seriesA.key]: 0, [seriesB.key]: 0 };

  return (
    <ClickableCard onClick={onClick} hint={hint}>
      <ChartHeading>{heading}</ChartHeading>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: 1 }}>
        <Typography variant="h6" fontWeight={700}>{valueLabel(latest)}</Typography>
      </Box>
      <Box component="svg" viewBox={`0 0 ${w} ${h}`} sx={{ width: '100%', height: 70, mt: 1 }} preserveAspectRatio="none">
        <polyline fill="none" stroke="#A5B4FC" strokeWidth="2" points={toPoints(seriesA.key)} />
        <polyline fill="none" stroke="#4F46E5" strokeWidth="2.5" points={toPoints(seriesB.key)} />
      </Box>
      <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
        <Stack direction="row" alignItems="center" spacing={0.7}>
          <Box sx={{ width: 10, height: 3, borderRadius: 1, bgcolor: '#A5B4FC' }} />
          <Typography variant="caption" color="text.secondary">{seriesA.label}</Typography>
        </Stack>
        <Stack direction="row" alignItems="center" spacing={0.7}>
          <Box sx={{ width: 10, height: 3, borderRadius: 1, bgcolor: '#4F46E5' }} />
          <Typography variant="caption" color="text.secondary">{seriesB.label}</Typography>
        </Stack>
      </Stack>
    </ClickableCard>
  );
}

export function ApprovalsCard({ heading = 'Pending Approvals', rows }) {
  return (
    <ClickableCard>
      <ChartHeading>{heading}</ChartHeading>
      <Stack spacing={1.8} sx={{ mt: 1.5 }}>
        {rows.map((r) => (
          <Box key={r.label} onClick={r.onClick} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: r.onClick ? 'pointer' : 'default', '&:hover': r.onClick ? { '& .a-label': { color: 'primary.main' } } : {} }}>
            <Box sx={{ width: 30, height: 30, borderRadius: 1.5, bgcolor: `${r.color}.50`, color: `${r.color}.main`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {r.icon}
            </Box>
            <Typography className="a-label" variant="body2" color="text.secondary" sx={{ flex: 1, transition: 'color .15s ease' }}>{r.label}</Typography>
            <Typography variant="subtitle2" fontWeight={700}>{r.value}</Typography>
          </Box>
        ))}
      </Stack>
    </ClickableCard>
  );
}
