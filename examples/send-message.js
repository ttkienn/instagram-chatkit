import { InstagramClient } from 'instagram-chatkit';

async function main() {
  const threadFbid = process.argv[2];
  const text = process.argv.slice(3).join(' ');
  const cookies = process.env.IGCHAT_COOKIES;

  if (!cookies) {
    console.error('Đặt IGCHAT_COOKIES trong .env rồi chạy với node --env-file=.env.');
    process.exitCode = 1;
    return;
  }

  if (!threadFbid || !text) {
    console.error('Cách dùng: node --env-file=.env examples/send-message.js <threadFbid> "Nội dung"');
    process.exitCode = 1;
    return;
  }

  const client = new InstagramClient({ cookies: cookies });

  try {
    await client.login();
    const sent = await client.messages.send(threadFbid, text);
    console.log('Đã gửi tin:', sent.messageId);
  } finally {
    await client.close();
  }
}

main().catch(function (error) {
  if (error.code === 'DELIVERY_UNKNOWN') {
    console.error('Chưa rõ tin đã gửi hay chưa. Kiểm tra chat trước khi gửi lại.');
  } else {
    console.error('Không gửi được tin:', error.code || 'UNKNOWN_ERROR');
  }

  process.exitCode = 1;
});
