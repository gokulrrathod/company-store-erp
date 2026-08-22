import express from 'express';
import cors from 'cors';
import 'dotenv/config';

import itemsRouter from './routes/items.js';
import stockMovementsRouter from './routes/stockMovements.js';
import materialRequestsRouter from './routes/materialRequests.js';
import authRouter from './routes/auth.js';
import suppliersRouter from './routes/suppliers.js';
import purchaseOrdersRouter from './routes/purchaseOrders.js';
import materialReceiptsRouter from './routes/materialReceipts.js';
import rejectedMaterialsRouter from './routes/rejectedMaterials.js';
import housekeepingRouter from './routes/housekeeping.js';
import safetyRouter from './routes/safety.js';
import dashboardRouter from './routes/dashboard.js';
import reportsRouter from './routes/reports.js';
import categoriesRouter from './routes/categories.js';
import enquiriesRouter from './routes/enquiries.js';
import salesOrdersRouter from './routes/salesOrders.js';
import budgetsRouter from './routes/budgets.js';
import drawingsRouter from './routes/drawings.js';
import productionRouter from './routes/production.js';
import projectsRouter from './routes/projects.js';
import vehiclesRouter from './routes/vehicles.js';
import invoicesRouter from './routes/invoices.js';
import notificationsRouter from './routes/notifications.js';
import { runMigrations } from './db/migrate.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRouter);
app.use('/api/items', itemsRouter);
app.use('/api/stock-movements', stockMovementsRouter);
app.use('/api/material-requests', materialRequestsRouter);
app.use('/api/suppliers', suppliersRouter);
app.use('/api/purchase-orders', purchaseOrdersRouter);
app.use('/api/material-receipts', materialReceiptsRouter);
app.use('/api/rejected-materials', rejectedMaterialsRouter);
app.use('/api/housekeeping', housekeepingRouter);
app.use('/api/safety', safetyRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/enquiries', enquiriesRouter);
app.use('/api/sales-orders', salesOrdersRouter);
app.use('/api/budgets', budgetsRouter);
app.use('/api/drawings', drawingsRouter);
app.use('/api/production', productionRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/vehicles', vehiclesRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/notifications', notificationsRouter);

// Centralized error handler: keep unexpected failures as JSON, not HTML stack traces
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const port = process.env.PORT || 4000;
runMigrations()
  .then(() => {
    app.listen(port, () => console.log(`Store POC API listening on http://localhost:${port}`));
  })
  .catch((err) => {
    console.error('Migration failed, refusing to start:', err);
    process.exit(1);
  });
