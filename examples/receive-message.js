import { InstagramClient, filters } from 'instagram-chatkit';

async function main() {
  const cookies = process.env.IGCHAT_COOKIES;

  if (!cookies) {
    console.error('Đặt IGCHAT_COOKIES trong .env rồi chạy với node --env-file=.env.');
    process.exitCode = 1;
    return;
  }

  const client = new InstagramClient({ cookies: cookies });
  let closePromise;

  function stop() {
    if (!closePromise) {
      closePromise = client.close().catch(function (error) {
        console.error('Không đóng được client:', error.code || 'UNKNOWN_ERROR');
        process.exitCode = 1;
      });
    }

    return closePromise;
  }

  const ping = filters.all(filters.incoming, filters.command('ping'));

  client.onMessage(ping, async function (message) {
    await message.replyText('pong');
  });

  client.onHandlerError(function (error) {
    console.error('Lỗi xử lý lệnh:', error.code);
  });

  client.on('listenerError', function (error) {
    console.error('Lỗi kết nối:', error.code);
  });

  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);

  try {
    await client.login();
    if (closePromise) return;

    await client.connectRealtime();

    if (!closePromise) {
      console.log('Đang nhận tin. Gửi /ping từ tài khoản khác để thử. Nhấn Ctrl+C để dừng.');
    }
  } catch (error) {
    if (!closePromise) {
      console.error('Không khởi động được:', error.code || 'UNKNOWN_ERROR');
      process.exitCode = 1;
    }

    await stop();
  }
}

main().catch(function (error) {
  console.error('Không tạo được client:', error.code || 'UNKNOWN_ERROR');
  process.exitCode = 1;
});
