// /api/calendly.js

import pino from 'pino';
import fetch from 'node-fetch'; // Add this line for Node.js environments < 18

const logger = pino();

export default async function handler(req, res) {
  logger.info({ method: req.method, url: req.url }, 'Incoming request');

  if (req.method !== 'POST') {
    logger.warn('Method not allowed');
    return res.status(405).send('Method not allowed');
  }

  const event = req.body;
  const payload = event.payload;

  if (!payload?.invitee || !payload?.event) {
    logger.error({ payload }, 'Missing payload or invitee/event data');
    return res.status(400).send('Missing payload or invitee/event data');
  }

  const invitee = payload.invitee;
  const calendlyEvent = payload.event;

  const name = invitee.name;
  const email = invitee.email;

  logger.info({ name, email }, 'Processing Calendly event');

  const startTime = new Date(calendlyEvent.start_time).toLocaleString('en-AU', {
    timeZone: calendlyEvent.location?.timezone || 'Australia/Sydney',
    dateStyle: 'full',
    timeStyle: 'short',
  });

  const zoomLink =
    invitee.join_url || calendlyEvent.location?.join_url || 'Zoom link not available';

  const slackMessage = {
    text: `📅 *New Appointment Booked*\n*Name:* ${name}\n*Time:* ${startTime}\n🔗 *Zoom:* ${zoomLink}`,
  };

  try {
    await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slackMessage),
    });

    logger.info({ name, startTime }, 'Slack notification sent successfully');

    return res.status(200).send('Notification sent to Slack.');
  } catch (err) {
    logger.error({ err }, 'Failed to send Slack notification');
    return res.status(500).send('Error sending Slack notification.');
  }
}
