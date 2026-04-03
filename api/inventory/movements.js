import { withTransaction, sql } from '../../src/lib/db.js'
import { withApi } from '../../src/lib/http.js'
import { logAudit } from '../../src/lib/audit.js'
import { oneOf, required, toInt } from '../../src/lib/validation.js'
import { ApiError } from '../../src/lib/errors.js'

export default withApi({ methods: ['POST'], roles: ['staff'] }, async (req) => {
  required(req.body, ['inventoryItemId', 'movementType', 'quantity', 'reason'])
  oneOf(req.body.movementType, ['in', 'out'], 'movementType')

  const inventoryItemId = toInt(req.body.inventoryItemId, 'inventoryItemId')
  const quantity = toInt(req.body.quantity, 'quantity')

  const movement = await withTransaction(async (tx) => {
    const itemReq = new sql.Request(tx)
    itemReq.input('inventoryItemId', sql.Int, inventoryItemId)
    const itemResult = await itemReq.query(`
      SELECT InventoryItemId, SiteId, Name, Stock
      FROM InventoryItems
      WHERE InventoryItemId = @inventoryItemId
    `)

    const item = itemResult.recordset[0]
    if (!item) throw new ApiError(404, 'Item no encontrado')
    const nextStock = req.body.movementType === 'in' ? item.Stock + quantity : item.Stock - quantity
    if (nextStock < 0) throw new ApiError(400, 'Stock insuficiente')

    const updateReq = new sql.Request(tx)
    updateReq.input('inventoryItemId', sql.Int, inventoryItemId)
    updateReq.input('nextStock', sql.Int, nextStock)
    await updateReq.query(`
      UPDATE InventoryItems
      SET Stock = @nextStock
      WHERE InventoryItemId = @inventoryItemId
    `)

    const insertReq = new sql.Request(tx)
    insertReq
      .input('inventoryItemId', sql.Int, inventoryItemId)
      .input('siteId', sql.Int, item.SiteId)
      .input('performedByUserId', sql.Int, req.auth.sub)
      .input('movementType', sql.NVarChar(10), req.body.movementType)
      .input('quantity', sql.Int, quantity)
      .input('reason', sql.NVarChar(255), req.body.reason)

    const insertResult = await insertReq.query(`
      INSERT INTO InventoryMovements (InventoryItemId, SiteId, PerformedByUserId, MovementType, Quantity, Reason)
      VALUES (@inventoryItemId, @siteId, @performedByUserId, @movementType, @quantity, @reason)
      RETURNING *
    `)

    return { item, movement: insertResult.recordset[0], nextStock }
  })

  await logAudit({
    siteId: movement.item.SiteId,
    actorUserId: req.auth.sub,
    eventType: req.body.reason.toLowerCase().includes('kit') && req.body.movementType === 'out' ? 'kit.delivered' : 'inventory.movement',
    entityType: 'inventory_movement',
    entityId: movement.movement.InventoryMovementId,
    metadata: { item: movement.item.Name, movementType: req.body.movementType, quantity },
  })

  return movement
})
