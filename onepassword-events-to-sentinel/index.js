import axios from 'axios';
import { DefaultAzureCredential } from '@azure/identity';
import { SecretClient } from '@azure/keyvault-secrets';

export default async function (context, myTimer) {
  const credential = new DefaultAzureCredential();
  const client = new SecretClient('https://onepasswordevents.vault.azure.net', credential);
  let cursor = await client.getSecret('onepassword-cursor');
  const auth = {
    headers: {
      Authorization: `Bearer ${process.env.OP_EVENTS_API}`,
      'Content-type': 'application/json',
    },
  };
  let body = {
    cursor: cursor.value,
  };
  try {
    let opEvents = await axios.post('https://events.1password.com/api/v1/itemusages', body, auth);
    try {
      const api = {
        headers: {
          'api-token': process.env.LOGIC_HUB_API,
          'Content-type': 'application/json',
        },
      };
      let logAnalytics = await axios.post(process.env.LOGIC_HUB_URL, JSON.stringify(opEvents.data), api);
      context.log(
        `${opEvents.data.items.length} 1Password event(s) sent to Azure Sentinel with server response code ${logAnalytics.status} and status response ${logAnalytics.statusText}`,
      );
      await client.setSecret('onepassword-cursor', opEvents.data.cursor);
      if (opEvents.data.has_more === false) {
        context.log('No new 1Password events to send.');
      } else {
        context.log('1Password has more events to send.');
      }
      if (cursor.value === opEvents.data.cursor) {
        context.log('The 1Password Cursor has not changed.');
      } else {
        context.log('The 1Password Cursor has changed.');
      }
    } catch (err) {
      context.log(`Unable to post to Azure Log Analytics with error message: ${err.message}`);
    }
  } catch (err) {
    context.log(`Unable to get events from 1Password with error message: ${err.message}`);
  }
}
