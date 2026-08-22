export async function addBatch(client, { itemId, batchNumber, expiryDate, quantity, source, grnId }) {
  await client.query(
    `INSERT INTO item_batches (item_id, batch_number, expiry_date, quantity_received, quantity_remaining, source, grn_id)
     VALUES ($1, $2, $3, $4, $4, $5, $6)`,
    [itemId, batchNumber || null, expiryDate || null, quantity, source, grnId || null]
  );
}

async function fetchAvailableBatches(client, itemId) {
  const { rows } = await client.query(
    `SELECT * FROM item_batches WHERE item_id = $1 AND quantity_remaining > 0
     ORDER BY expiry_date ASC NULLS LAST, received_at ASC, id ASC
     FOR UPDATE`,
    [itemId]
  );
  return rows;
}

// Consumes stock FIFO/FEFO (nearest expiry first, then oldest-received first) unless an
// override batch is given, in which case that batch is drawn from first — requiring a
// reason whenever it isn't the batch FIFO/FEFO would have picked (Store §2, AC3).
export async function consumeStock(client, itemId, quantity, { overrideBatchId, overrideReason } = {}) {
  const batches = await fetchAvailableBatches(client, itemId);
  const totalAvailable = batches.reduce((sum, b) => sum + Number(b.quantity_remaining), 0);
  if (totalAvailable < Number(quantity)) {
    throw new Error('Insufficient stock to issue');
  }

  let ordered = batches;
  if (overrideBatchId) {
    const suggested = batches[0];
    if (!suggested || String(suggested.id) !== String(overrideBatchId)) {
      if (!overrideReason || !overrideReason.trim()) {
        throw new Error('An override reason is required when issuing a batch other than the suggested FIFO/FEFO batch');
      }
    }
    const chosen = batches.find((b) => String(b.id) === String(overrideBatchId));
    if (!chosen) throw new Error('Selected batch not found or has no remaining stock');
    ordered = [chosen, ...batches.filter((b) => String(b.id) !== String(overrideBatchId))];
  }

  let remaining = Number(quantity);
  const consumed = [];
  for (const batch of ordered) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, Number(batch.quantity_remaining));
    await client.query(`UPDATE item_batches SET quantity_remaining = quantity_remaining - $1 WHERE id = $2`, [take, batch.id]);
    consumed.push({ batch_id: batch.id, batch_number: batch.batch_number || 'OPENING', quantity: take });
    remaining -= take;
  }

  await client.query(`UPDATE items SET quantity = quantity - $1 WHERE id = $2`, [quantity, itemId]);

  return consumed;
}

export function describeConsumption(consumed) {
  return consumed.map((c) => `${c.batch_number} x${c.quantity}`).join(', ');
}
