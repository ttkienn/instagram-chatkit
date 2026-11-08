import { InstagramClient } from 'instagram-chatkit';
import { SimpleBot } from 'instagram-chatkit/bot';

async function main() {
  const cookies = process.env.IGCHAT_COOKIES;

  if (!cookies) {
    console.error('Đặt IGCHAT_COOKIES trong .env rồi chạy với node --env-file=.env.');
    process.exitCode = 1;
    return;
  }

  const admins = [];
  const values = (process.env.IGCHAT_ADMINS || '').split(',');

  for (const value of values) {
    const id = value.trim();
    if (id) admins.push(id);
  }

  const client = new InstagramClient({ cookies: cookies });
  const bot = new SimpleBot({
    client: client,
    admins: admins,
    logger: function (event) {
      console.log('Bot:', event);
    },
  });

  let closePromise;

  function stop() {
    if (!closePromise) {
      closePromise = bot.close().catch(function (error) {
        console.error('Không đóng được bot:', error.code || 'UNKNOWN_ERROR');
        process.exitCode = 1;
      });
    }

    return closePromise;
  }

  client.on('listenerError', function (error) {
    console.error('Lỗi kết nối:', error.code);
  });

  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);

  try {
    await client.login();
    if (closePromise) return;

    await bot.start();

    if (!closePromise) {
      console.log('Bot đã sẵn sàng. Gửi /help từ tài khoản khác để xem lệnh.');
    }
  } catch (error) {
    if (!closePromise) {
      console.error('Không khởi động được bot:', error.code || 'UNKNOWN_ERROR');
      process.exitCode = 1;
    }

    await stop();
  }
}

main().catch(function (error) {
  console.error('Không tạo được bot:', error.code || 'UNKNOWN_ERROR');
  process.exitCode = 1;
});
