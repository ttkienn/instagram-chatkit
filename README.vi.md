<div align="center">
  <img src="https://raw.githubusercontent.com/ttkienn/instagram-chatkit/main/assets/instagram-chatkit.png" alt="instagram-chatkit" width="900">
  <h1>instagram-chatkit</h1>
  <p><a href="https://github.com/ttkienn/instagram-chatkit#readme">English</a> · <strong>Tiếng Việt</strong></p>
  <p>Gửi và nhận tin nhắn Instagram trên Node.js, đăng nhập bằng cookie trình duyệt.</p>
  <p>
    <a href="https://www.npmjs.com/package/instagram-chatkit"><img src="https://img.shields.io/badge/npm-instagram--chatkit-CB3837?logo=npm&amp;logoColor=white" alt="npm: instagram-chatkit"></a>
    <img src="https://img.shields.io/badge/Node.js-24%2B-339933?logo=nodedotjs&amp;logoColor=white" alt="Node.js 24 trở lên">
    <a href="https://github.com/ttkienn/instagram-chatkit/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-333333" alt="Giấy phép MIT"></a>
  </p>
  <p>
    <a href="https://github.com/ttkienn/instagram-chatkit/blob/main/docs/DOCS.md">Các hàm</a> ·
    <a href="https://github.com/ttkienn/instagram-chatkit/blob/main/examples/receive-message.js">Ví dụ</a> ·
    <a href="https://github.com/ttkienn/instagram-chatkit">GitHub</a> ·
    <a href="https://github.com/ttkienn/instagram-chatkit/issues">Báo lỗi</a>
  </p>
</div>

---

## Cài đặt

Cần Node.js 24 trở lên.

```bash
npm install instagram-chatkit
```

## Lấy cookie

Trên Chrome hoặc Edge, đăng nhập [Instagram](https://www.instagram.com), nhấn F12 → **Network** rồi tải lại trang. Chọn request tới `www.instagram.com` → **Headers → Request Headers → cookie**, nhấp phải dòng đó → **Copy value**. Dán nguyên chuỗi vừa chép vào `IGCHAT_COOKIES` trong `.env`:

```dotenv
IGCHAT_COOKIES="sessionid=...; csrftoken=...; ds_user_id=..."
```

## Bot đầu tiên

Lưu code sau thành `bot.mjs`:

```js
import { InstagramClient } from 'instagram-chatkit';

async function main() {
  const client = new InstagramClient({
    cookies: process.env.IGCHAT_COOKIES,
    logger: console,
    logLevel: 'info',
  });
  let stopping = false;

  async function stop() {
    if (stopping) return;
    stopping = true;

    try {
      await client.close();
      console.log('Bot stopped.');
    } catch (error) {
      console.error('Could not stop:', error.code || 'UNKNOWN_ERROR');
      process.exitCode = 1;
    }
  }

  async function handleMessage(message) {
    if (message.text === '/ping') {
      await message.replyText('pong');
      console.log('Replied to /ping.');
    }
    if (message.text === '/help') {
      await message.replyText('Commands: /ping, /help');
      console.log('Replied to /help.');
    }
  }

  function handleEvent(event) {
    if (event.type === 'raw') return;
    if (event.type === 'threadUpdate') {
      if (event.data.initial) return;
      console.log('Group event:', event.data.nativeThreadId,
        event.data.property || 'snapshot', event.data.change);
      return;
    }
    console.log('Event:', event.type);
  }

  client.onMessage(handleMessage);
  client.on('event', handleEvent);
  client.onHandlerError(function (error) {
    console.error('Command failed:', error.cause?.code || error.code);
  });
  client.on('state', function (state) {
    if (state.state === 'connected') {
      console.log('Bot ready. Send /ping or /help from another account. Ctrl+C to stop.');
    }
    if (state.state === 'fatal' || state.state === 'auth_required') {
      process.exitCode = 1;
      stop();
    }
  });

  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);

  try {
    await client.login();
    if (stopping) return;
    await client.connectRealtime();
  } catch (error) {
    if (!stopping) {
      console.error('Could not start:', error.code || 'UNKNOWN_ERROR');
      process.exitCode = 1;
    }

    await stop();
  }
}

main().catch(function (error) {
  console.error('Could not create the client:', error.code || 'UNKNOWN_ERROR');
  process.exitCode = 1;
});
```

Chạy, đợi dòng `Bot ready`, rồi gửi `/ping` hoặc `/help` từ tài khoản khác:

```bash
node --env-file=.env bot.mjs
```

Nhấn Ctrl+C để dừng. Code giống [examples/receive-message.js](https://github.com/ttkienn/instagram-chatkit/blob/main/examples/receive-message.js), không cần framework bot hay cài thêm thư viện.

`logger: console` ghi log đăng nhập, trạng thái kết nối, lần kết nối lại, lỗi request và lỗi xử lý lệnh. Log chỉ có thông tin như `event`, `code`, HTTP status; không có cookie hay nội dung tin nhắn. Dòng `Command failed` hiển thị mã lỗi gốc của thao tác reply. Bot đóng kết nối khi khởi động lỗi, nhấn Ctrl+C hoặc kết nối dừng ở trạng thái cuối.

Muốn đổi câu trả lời, sửa chuỗi trong `handleMessage`. Muốn thêm lệnh, thêm một `if`. `replyText` trích dẫn tin nhắn đang nhận. Reply ảnh, video, voice qua `replyPhoto`, `replyVideo`, `replyVoice` còn cần web MID của tin gốc; xem [ví dụ và giới hạn reply](https://github.com/ttkienn/instagram-chatkit/blob/main/docs/DOCS.md).

`handleEvent` bắt event SDK qua `client.on('event', ...)`. Với `threadUpdate`, log cho biết nhóm, trường thay đổi và thao tác patch. Các trường thường gặp là `thread_title` (tên), `theme`/`theme_data` (chủ đề), `nicknames` (biệt danh), `users` (thành viên). Ví dụ bỏ qua raw patch và snapshot ban đầu khi ghi log. Để phân biệt người vào/rời nhóm, cần lưu danh sách thành viên ban đầu rồi so với danh sách mới; `add/replace/remove` chỉ là thao tác patch. Xem [thay đổi nhóm](https://github.com/ttkienn/instagram-chatkit/blob/main/docs/DOCS.md#group-changes) để dùng `onThreadUpdate()` và xử lý mốc ban đầu. Phần metadata patch và snapshot ban đầu cần phiên bản 3.2.1 trở lên.

## Tài liệu

| Bạn cần | Xem tại |
| --- | --- |
| Tra hàm gửi, nhận tin, media và bộ lọc | [Các hàm và cách dùng (tiếng Anh)](https://github.com/ttkienn/instagram-chatkit/blob/main/docs/DOCS.md) |
| Chạy thử gửi hoặc nhận tin | [Gửi tin](https://github.com/ttkienn/instagram-chatkit/blob/main/examples/send-message.js) · [Nhận tin](https://github.com/ttkienn/instagram-chatkit/blob/main/examples/receive-message.js) |
| Chạy bot có sẵn | [Ví dụ bot](https://github.com/ttkienn/instagram-chatkit/blob/main/examples/optional/bot.js) |
| Sửa code thư viện | [Cấu trúc code (tiếng Anh)](https://github.com/ttkienn/instagram-chatkit/blob/main/docs/ARCHITECTURE.md) |

## Lưu ý

- Không đưa cookie, `.env` hoặc file lưu đăng nhập lên Git.
- Đăng bài, Stories, Highlights, Live và caption chung trong tin ảnh chưa được hỗ trợ.
- Gặp `DELIVERY_UNKNOWN` thì kiểm tra chat trước khi gửi lại, tránh trùng tin.

## Tác giả

<table>
  <tr>
    <td align="center" width="100">
      <a href="https://github.com/ttkienn">
        <img src="https://github.com/ttkienn.png?size=160" alt="Avatar GitHub của Thiệu Trung Kiên" width="80" height="80">
      </a>
    </td>
    <td>
      <strong>Thiệu Trung Kiên</strong><br>
      <a href="https://www.facebook.com/ttkiennn">Facebook</a> ·
      <a href="https://github.com/ttkienn">GitHub</a> ·
      <a href="https://www.npmjs.com/~thieutrungkien2">npm</a>
    </td>
  </tr>
</table>

## Ủng hộ

<p align="center">
  <img src="https://raw.githubusercontent.com/ttkienn/instagram-chatkit/main/assets/donate-mbbank.png" alt="QR ủng hộ MB Bank, tài khoản 543888999" width="240"><br>
  <strong>MB Bank · 543888999</strong>
</p>

Quét QR bằng ứng dụng ngân hàng và nhập số tiền bạn muốn gửi.

## Giấy phép

[MIT](https://github.com/ttkienn/instagram-chatkit/blob/main/LICENSE). Giấy phép và ghi nhận tác giả của các phần từ dự án khác được giữ trong [LICENSE](https://github.com/ttkienn/instagram-chatkit/blob/main/LICENSE).
