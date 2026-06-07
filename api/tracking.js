const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { trackingNumber } = req.query

    if (!trackingNumber) {
      return res.status(400).json({ error: 'Tracking number is required' })
    }

    try {
      const shipment = await prisma.shipment.findUnique({
        where: { trackingNumber },
        include: {
          events: {
            orderBy: { eventDate: 'desc' }
          }
        }
      })

      if (!shipment) {
        return res.status(404).json({ error: 'Shipment not found' })
      }

      return res.status(200).json({
        trackingNumber: shipment.trackingNumber,
        status: shipment.status,
        origin: shipment.origin,
        destination: shipment.destination,
        events: shipment.events.map(e => ({
          date: e.eventDate,
          title: e.title,
          location: e.location
        }))
      })
    } catch (error) {
      console.error('Database error:', error)
      return res.status(500).json({ error: 'Database connection failed' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}