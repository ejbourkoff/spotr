import apn from 'apn';

let _provider: apn.Provider | null = null;

function provider(): apn.Provider | null {
  const keyB64 = process.env.APNS_KEY_P8_B64;
  if (!keyB64 || !process.env.APNS_KEY_ID || !process.env.APNS_TEAM_ID || !process.env.APNS_BUNDLE_ID) {
    return null;
  }
  if (_provider) return _provider;
  _provider = new apn.Provider({
    token: {
      key: Buffer.from(keyB64, 'base64').toString('utf8'),
      keyId: process.env.APNS_KEY_ID,
      teamId: process.env.APNS_TEAM_ID,
    },
    production: process.env.NODE_ENV === 'production',
  });
  return _provider;
}

export async function sendPush(
  deviceTokens: string[],
  body: string,
  data?: Record<string, string>
): Promise<void> {
  const p = provider();
  if (!p || deviceTokens.length === 0) return;

  const note = new apn.Notification();
  note.expiry = Math.floor(Date.now() / 1000) + 3600;
  note.badge = 1;
  note.sound = 'default';
  note.alert = { title: 'SPOTR', body };
  note.topic = process.env.APNS_BUNDLE_ID!;
  if (data) note.payload = data;

  await p.send(note, deviceTokens).catch(() => {});
}
