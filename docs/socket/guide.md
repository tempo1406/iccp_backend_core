# Socket Implementation Guide (Chuẩn hiện tại)

Tài liệu này là chuẩn triển khai Socket cho các feature tiếp theo trong `iccp_be_core`.
Mục tiêu: mọi feature realtime mới phải bám flow hiện tại, tránh lệch namespace/auth/event/payload.

---

## 1) Stack hiện tại

- Dự án dùng **NestJS + Socket.IO** (không phải WebSocket thuần).
- Adapter khởi tạo tại `main.ts` qua `app.useWebSocketAdapter(new WebsocketAdapter(app))`.
- Namespace đang dùng cho notification: `notifications`.

---

## 2) Luồng chuẩn hiện tại (Notification)

### 2.1 Connect & Auth

1. Client connect tới namespace `notifications`.
2. Token truyền qua `handshake.auth.accessToken` (ưu tiên) hoặc header `Authorization: Bearer <token>`.
3. `BaseGateway.handleConnection()` verify JWT.
4. Nếu hợp lệ:
	 - set `client.data.user`
	 - set `client.data.userId`
	 - auto join room `user:<userId>`
5. Nếu fail: emit `exception` + disconnect.

### 2.2 Server push notification

1. Feature gọi `NotificationService.send(...)` (hoặc API admin tạo noti).
2. Service lưu DB và emit internal event `notification.created`.
3. `NotificationWsListener` bắt event và gọi `websocketService.emitToUser(...)`.
4. Client nhận event `notification.new`.

---

## 3) Event contract chuẩn

### 3.1 Server -> Client

- `notification.new`

### 3.2 Payload `notification.new`

```json
{
	"id": "uuid",
	"type": "info",
	"title": "string",
	"message": "string",
	"data": {},
	"createdAt": "2026-03-14T12:00:00.000Z"
}
```

> Hiện tại notification module **không dùng** client events join/leave org/project.

---

## 4) Quy tắc khi làm feature mới cần realtime

## 4.1 Rule bắt buộc

- Không emit trực tiếp từ business module bằng `Server`/`Socket`.
- Chỉ emit qua `WebsocketService`.
- Mọi payload phải có type trong `src/modules/websocket/types`.
- Tên event theo pattern: `domain.action` (ví dụ `notification.new`).
- Không thêm room logic vào NotificationGateway nếu không phải use-case notification cá nhân.

### 4.2 Khi nào dùng room nào

- `user:<userId>`: mặc định cho notification cá nhân (ưu tiên).
- `org:<orgId>` / `project:<projectId>`: chỉ dùng khi có use-case broadcast thật sự.
- Nếu có broadcast org/project cho module khác, tạo gateway/module riêng thay vì nhét vào notification.

---

## 5) Checklist implement feature socket mới

1. **Định nghĩa event constant** trong `ws-events.constant.ts`.
2. **Định nghĩa payload type** (file domain tương ứng trong `types/`).
3. **Map event -> payload** trong `ws-event-payload-map.type.ts`.
4. **Business service** emit internal domain event (`@nestjs/event-emitter`).
5. **WS listener** bắt domain event và gọi `WebsocketService.emitToUser|emitToOrg|emitToProject`.
6. **Không bypass type system** (`any`) cho payload/event.
7. **Update docs** (file này + docs feature).

---

## 6) Template triển khai nhanh

### 6.1 Event constant

```ts
export const WsEvents = {
	NOTIFICATION_NEW: 'notification.new',
	FEATURE_X_UPDATED: 'feature_x.updated',
} as const;
```

### 6.2 Payload map

```ts
export interface FeatureXUpdatedPayload {
	id: string;
	status: string;
	updatedAt: string;
}

export interface WsEventPayloadMap {
	[WsEvents.NOTIFICATION_NEW]: NotificationWsPayload;
	[WsEvents.FEATURE_X_UPDATED]: FeatureXUpdatedPayload;
}
```

### 6.3 Emit trong listener

```ts
this.websocketService.emitToUser(userId, WsEvents.FEATURE_X_UPDATED, payload);
```

---

## 7) Test nhanh bằng Postman (Socket.IO)

1. Dùng tab **Socket.IO** (không dùng raw WebSocket).
2. URL: `http://localhost:<port>/notifications`.
3. Handshake auth:
	 - `accessToken: <JWT>`
4. Listen event: `notification.new`, `exception`.
5. Gọi API tạo notification -> xác nhận socket nhận được `notification.new`.

---

## 8) Anti-pattern cần tránh

- Nhúng logic auth lặp lại ở từng gateway con.
- Tạo event name không theo chuẩn domain.
- Emit event không có type map.
- Dùng chung một gateway cho mọi domain realtime.
- Để constants dead code không còn consumer.

---

## 9) Quy ước maintain

- Mỗi lần thêm event mới: update đủ 3 chỗ `WsEvents` + payload type + payload map.
- Nếu xoá feature socket: xoá luôn constant/payload map/import liên quan.
- Mọi thay đổi flow phải cập nhật file guide này.


---

## 10) Chat-box realtime (chat namespace)

### 10.1 Namespace va client events

- Namespace: `chat`
- Client -> Server:
  - `chat.room.subscribe` voi payload `{ organizationId, roomId }`
  - `chat.room.unsubscribe` voi payload `{ organizationId, roomId }`

> Security: server check JWT + check user la active member cua room truoc khi join `chat-room:<roomId>`.

### 10.2 Server events (chat)

- `chat.message.created`
- `chat.message.updated`
- `chat.message.deleted`
- `chat.message.reaction.updated`
- `chat.message.pin.updated`
- `chat.message.attachment.added`
- `chat.message.attachment.removed`
- `chat.room.invitation.created`
- `chat.room.member.joined`
- `chat.room.member.role.updated`
- `chat.room.member.removed`
- `chat.presence.updated`

### 10.3 Integration rule

- Business service chi emit domain event qua `EventEmitter2`.
- `ChatBoxWsListener` la noi duy nhat bridge event -> socket emit.
- Socket emit di qua `WebsocketService` va chi dinh namespace `chat`.

### 10.4 Reaction event note (performance update 2026-04-08)

- Event `chat.message.reaction.updated` da doi sang room-level emit (khong con per-user emit).
- Payload co them `reactorUserIds` de FE tu tinh state current user.
- `reactedByMe` trong event nay khong duoc xem la personalized theo tung socket receiver.

### 10.5 Link-preview event note (performance update 2026-04-08)

- Event `chat.message.link-preview.updated` da doi sang room-level emit (khong con per-user internal-reference resolver).
- Payload event duoc phat theo message metadata hien tai; FE khong nen gia dinh payload da personalized theo quyen tung user.
- Neu can card chi tiet cho internal message link, FE lazy goi `GET /api/v1/chat-box/messages/link-preview`.

### 10.6 `roomDelta` note (performance update 2026-04-08)

- Cac event `chat.message.created|updated|deleted` va `chat.message.reaction.updated` co them field optional `roomDelta`.
- FE co the patch local room row/sidebar tu `roomDelta` de tranh invalidate/refetch rong `rooms`.
- Khi `roomDelta.shouldRefreshRoomSummary=false`, khuyen nghi khong refetch full room list ngay.

### 10.7 Pin event note (contract update 2026-04-12)

- Event `chat.message.pin.updated` phai luon co `eventId`, `action`, `roomPinVersion`, `pinnedCount`, `isPinned`, `messageId`, `roomId`, `actorUserId`, `occurredAt`.
- `action` chi nhan `pinned` hoac `unpinned`; FE khong nen tiep tuc suy luan action tu `isPinned`.
- `pin` la snapshot toi gian cua ban ghi pin va chi co gia tri khi `action = pinned`; voi `unpinned` thi `pin = null`.
- `roomPinVersion` la counter tang dan theo room de FE bo qua event cu/out-of-order. Hien tai BE uu tien Redis counter, co local monotonic fallback neu Redis tam thoi loi.
- Mutation `POST/DELETE .../pin` tra ve cung contract voi `action`, `updated`, `isPinned`, `roomPinVersion`, `pinnedCount`, `pin` de FE patch optimistic state ma khong can refetch pinned list ngay.
