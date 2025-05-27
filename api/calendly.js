export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  const { payload } = req.body;

  if (!payload) return res.status(400).send('Missing payload');

  const invitee = payload.invitee;
  const event = payload.event;

  const name = invitee.name;
  const email = invitee.email;
  const startTime = new Date(event.start_time).toLocaleString('en-AU', {
    timeZone: event.location.timezone || 'Australia/Sydney',
    dateStyle: 'full',
    timeStyle: 'short'
  });

  const zoomLink = invitee.join_url || event.location.join_url || 'Zoom link not available';

  const slackMessage = {
    text: `📅 *New Appointment Booked*\n*Name:* ${name}\n*Time:* ${startTime}\n🔗 *Zoom:* ${zoomLink}`,
  };

  try {
    await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slackMessage),
    });

    return res.status(200).send('Notification sent to Slack.');
  } catch (err) {
    console.error(err);
    return res.status(500).send('Error sending Slack notification.');
  }
}
