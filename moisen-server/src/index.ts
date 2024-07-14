import { 
  messagingApi,
  webhook,
} from '@line/bot-sdk'
import { Hono } from 'hono'

type Bindings = {
  CHANNEL_ACCESS_TOKEN: string,
  CHANNEL_SECRET: string,
}

const app = new Hono<{ Bindings: Bindings }>()

app.get('/', (c) => {
  return c.text('Hello hayashi!')
})

app.post('/webhook', async (c) => {

  const body = await c.req.json()
  const channelAccessToken = c.env.CHANNEL_ACCESS_TOKEN || process.env.CHANNEL_ACCESS_TOKEN || ''

  const events = body.events
  const promises = events.map((event: webhook.Event) => handleEvent(event, channelAccessToken))
  await Promise.all(promises)

  return c.text('OK')
})

const handleEvent = async (
  event: webhook.Event,
  accessToken: string,
) => {
  if (event.type !== 'message' || (event.message.type !== 'text' && event.message.type !== 'image')) return;
  if (!event.replyToken) return;

  await fetch('https://api.line.me/v2/bot/chat/loading/start', {
    method: 'POST',
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({"chatId": event.source?.userId})
  });

  let responseBody: messagingApi.ReplyMessageRequest;

  if (event.message.type === 'image') {
    responseBody = {
      replyToken: event.replyToken,
      messages: [
        {
          'type': 'template',
          'altText': 'phone announce',
          'template': {
            'type': 'confirm',
            'text': 'AI林さんからのお電話です',
            'actions': [
              {
                'type': 'uri', // or 'message' depending on your use case
                'label': '電話に出る',
                'uri': 'https://liff.line.me/2000869865-q8dvQa3v'
              },
              {
                'type': 'postback', // Adding a cancel action
                'label': 'キャンセル',
                'data': 'action=cancel'
              }
            ]
          }
        }
      ] 
    };
  } else {
    responseBody = {
      replyToken: event.replyToken,
      messages: [
        {'type': 'text', 'text': '問診票をご準備できたら写真を撮って送信をお願いします'}
      ] 
    };
  }

  await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(responseBody)
  });
}

export default app
