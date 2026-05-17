import { URLSearchParams } from 'url'

const NEW_WAYBILL_URL = 'https://www.fdedomestic.com/api/parcel/new_api_v1.php'
const EXISTING_WAYBILL_URL = 'https://www.fdedomestic.com/api/parcel/existing_waybill_api_v1.php'

const STATUS_MESSAGES = {
  200: 'Success',
  201: 'Inactive client',
  202: 'Invalid order ID',
  203: 'Invalid weight',
  204: 'Empty or invalid parcel description',
  205: 'Empty or invalid recipient name',
  206: 'Contact number 1 is not valid',
  207: 'Contact number 2 is not valid',
  208: 'Empty or invalid address',
  209: 'Invalid city',
  210: 'Unsuccessful insert, try again',
  211: 'Invalid API key',
  212: 'Invalid or inactive client',
  213: 'Invalid exchange value',
  214: 'System is in maintenance mode',
}

// Map Fardar delivery status strings to ORM order statuses
export const FARDAR_STATUS_MAP = {
  'Picked Up': 'dispatched',
  'Collected': 'dispatched',
  'In Transit': 'shipped',
  'On The Way': 'shipped',
  'Out For Delivery': 'shipped',
  'Delivered': 'delivered',
  'Returned': 'returned',
  'Return To Sender': 'returned',
  'Cancelled': 'cancelled',
}

const postForm = async (url, data) => {
  const params = new URLSearchParams(data)
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })
  if (!res.ok) throw new Error(`Fardar HTTP error: ${res.status}`)
  return res.json()
}

// Create a new waybill for an order
export const createWaybill = async ({ order, weight = '0.5', description, exchange = '0' }) => {
  const items = Array.isArray(order.items) ? order.items : []
  const itemDesc = description || items.map(i => `${i.productName || 'Item'} x${i.quantity}`).join(', ') || 'Clothing items'

  const data = {
    client_id: process.env.FARDAR_CLIENT_ID,
    api_key: process.env.FARDAR_API_KEY,
    order_id: order.orderNumber || order.id,
    parcel_weight: String(weight),
    parcel_description: itemDesc.slice(0, 200),
    recipient_name: order.customerName,
    recipient_contact_1: order.customerPhone,
    recipient_contact_2: order.alternativePhone || '',
    recipient_address: [order.shippingAddress, order.addressLine2].filter(Boolean).join(', '),
    recipient_city: order.city,
    amount: String(order.codAmount || order.total || 0),
    exchange: String(exchange),
  }

  const result = await postForm(NEW_WAYBILL_URL, data)

  if (result.status !== 200) {
    const msg = STATUS_MESSAGES[result.status] || `Fardar error (code ${result.status})`
    throw new Error(msg)
  }

  return result.waybill_no
}

// Assign an existing (pre-printed) waybill number to an order
export const assignExistingWaybill = async ({ order, waybillId, weight = '0.5', description, exchange = '0' }) => {
  const items = Array.isArray(order.items) ? order.items : []
  const itemDesc = description || items.map(i => `${i.productName || 'Item'} x${i.quantity}`).join(', ') || 'Clothing items'

  const data = {
    client_id: process.env.FARDAR_CLIENT_ID,
    api_key: process.env.FARDAR_API_KEY,
    waybill_id: String(waybillId),
    order_id: order.orderNumber || order.id,
    parcel_weight: String(weight),
    parcel_description: itemDesc.slice(0, 200),
    recipient_name: order.customerName,
    recipient_contact_1: order.customerPhone,
    recipient_contact_2: order.alternativePhone || '',
    recipient_address: [order.shippingAddress, order.addressLine2].filter(Boolean).join(', '),
    recipient_city: order.city,
    amount: String(order.codAmount || order.total || 0),
    exchange: String(exchange),
  }

  const result = await postForm(EXISTING_WAYBILL_URL, data)

  if (result.status !== 200) {
    const msg = STATUS_MESSAGES[result.status] || `Fardar error (code ${result.status})`
    throw new Error(msg)
  }

  return result.waybill_no
}
