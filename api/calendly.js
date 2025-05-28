// /api/calendly.js
import pino from 'pino';
const logger = pino();

export default async function handler(req, res) {
  logger.info({ method: req.method, url: req.url }, 'Incoming request');
  
  if (req.method !== 'POST') {
    logger.warn('Method not allowed');
    return res.status(405).send('Method not allowed');
  }
  
  const event = req.body;
  const payload = event.payload;
  
  // Fix: Check for the correct payload structure
  if (!payload || !payload.name || !payload.scheduled_event) {
    logger.error({ payload }, 'Missing payload or invitee/event data');
    return res.status(400).send('Missing payload or invitee/event data');
  }
  
  // Fix: Extract data from the correct locations
  const name = payload.name;
  const email = payload.email;
  const calendlyEvent = payload.scheduled_event;
  
  logger.info({ name, email }, 'Processing Calendly event');
  
  const startTime = new Date(calendlyEvent.start_time).toLocaleString('en-AU', {
    timeZone: payload.timezone || 'Australia/Sydney',
    dateStyle: 'full',
    timeStyle: 'short',
  });
  
  // Fix: Extract Zoom link from the correct location
  const zoomLink = calendlyEvent.location?.join_url || 'Zoom link not available';
  
  // Include additional meeting details if available
  const eventName = calendlyEvent.name || 'Meeting';
  
  // Check if there are questions and answers
  let additionalInfo = '';
  if (payload.questions_and_answers && payload.questions_and_answers.length > 0) {
    const qa = payload.questions_and_answers[0];
    additionalInfo = `\n*${qa.question}* ${qa.answer}`;
  }
  
  const slackMessage = {
    text: `📅 New Appointment Booked\n*Event:* ${eventName}\n*Name:* ${name}\n*Email:* ${email}\n*Time:* ${startTime}\n🔗 Zoom: ${zoomLink}${additionalInfo}`,
  };
  
  try {
    const response = await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slackMessage),
    });
    
    if (!response.ok) {
      throw new Error(`Slack responded with status ${response.status}`);
    }
    
    logger.info({ name, startTime }, 'Slack notification sent successfully');
    return res.status(200).send('Notification sent to Slack.');
  } catch (err) {
    logger.error({ err }, 'Failed to send Slack notification');
    return res.status(500).send('Error sending Slack notification.');
  }
}
