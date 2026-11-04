---
marp: true
theme: default
paginate: true
size: 16:9
header: 'ICCP — Internal Consulting Chatbot Platform'
footer: 'Đồ án tốt nghiệp · 2026'
---

<!--
============================================================
HƯỚNG DẪN SỬ DỤNG FILE NÀY
============================================================
- File này viết theo cú pháp Marp. Có thể export PPTX/PDF bằng:
    npx @marp-team/marp-cli@latest PRESENTATION.md -o slides.pptx
    npx @marp-team/marp-cli@latest PRESENTATION.md --pdf
- Khối "Speaker notes" nằm trong comment <!-- ... --> ngay dưới mỗi slide
  và sẽ được Marp đưa vào notes của PowerPoint.
- Tổng thời lượng mục tiêu: 40 phút.
    • Phần slide:  ~25 phút (mỗi slide ~1–2 phút)
    • Phần demo:   ~12–14 phút
    • Hỏi & đáp / chốt:  ~1–3 phút
- Các con số / công nghệ trong file đã được đối chiếu với mã nguồn 4 dự án:
  iccp_backend_core (NestJS), iccp_be_ai (FastAPI), iccp_web (Next.js),
  iccp_admin_web (Next.js). Không liệt kê các điểm chưa được xác nhận.
-->

# **ICCP**
## Internal Consulting Chatbot Platform

Nền tảng SaaS đa khách hàng hỗ trợ doanh nghiệp triển khai
chatbot RAG nội bộ tích hợp quản trị tổ chức & dự án

<br>

**Sinh viên thực hiện:** _[Họ và tên]_
**Giáo viên hướng dẫn:** _[Họ và tên]_
**Hội đồng:** _[Tên hội đồng]_ — 2026

<!--
SPEAKER NOTES (~30s)
- Chào hội đồng, giới thiệu tên, đề tài: "ICCP - Nền tảng chatbot tư vấn nội bộ
  cho doanh nghiệp".
- Mở đầu thẳng: "Sản phẩm là một nền tảng SaaS đa khách hàng giúp doanh nghiệp
  vừa quản lý tổ chức, dự án, tài liệu, vừa có chatbot RAG trả lời dựa trên
  chính tài liệu của họ. Em xin trình bày trong khoảng 25 phút slide và
  10–14 phút demo."
-->

---

# Nội dung trình bày

1. Bối cảnh & Tổng quan
2. Bài toán đặt ra
3. Giải pháp & Mục tiêu đồ án
4. Công nghệ sử dụng
5. Kiến trúc hệ thống
6. Các tính năng chính
7. Demo sản phẩm
8. Kết quả đạt được
9. Hạn chế & Hướng phát triển
10. Kết luận

<!--
SPEAKER NOTES (~20s)
- "Bài thuyết trình được chia thành 10 phần. Em sẽ đi nhanh phần lý thuyết để
  dành thời gian cho demo - là phần thể hiện rõ nhất giá trị của hệ thống."
-->

---

<!-- _class: lead -->
# 1. Context & Background
## Bối cảnh & Tổng quan

⏱ ~2 phút

---

# Bối cảnh

- Doanh nghiệp ngày càng phụ thuộc vào **kho tri thức nội bộ**:
  quy trình, hợp đồng, tài liệu kỹ thuật, KPI, biên bản dự án.
- Nhân viên mất nhiều thời gian để **tìm và tổng hợp thông tin**
  qua nhiều hệ thống rời rạc (drive, email, wiki…).
- Các trợ lý AI chung (ChatGPT, Gemini) **không truy cập được**
  dữ liệu nội bộ và không đảm bảo bảo mật / phân quyền.
- Xu hướng: **RAG + multi-tenant SaaS** cho phép từng tổ chức có
  một “ChatGPT của riêng họ” trên dữ liệu của chính họ.

<!--
SPEAKER NOTES (~1.5 phút)
- Nhấn mạnh: vấn đề không phải thiếu LLM, mà là LLM không thấy được
  dữ liệu nội bộ và không tôn trọng phân quyền của tổ chức.
- Đó là lý do nhóm chọn hướng RAG + multi-tenant.
-->

---

# Đối tượng người dùng

| Vai trò | Mô tả |
|---|---|
| **System Admin** | Vận hành nền tảng, quản lý gói cước, tổ chức, giao dịch |
| **Org Admin / Owner** | Cấu hình tổ chức, quản lý thành viên, role, quota, billing |
| **Project Manager** | Tạo & quản lý dự án, KPI, báo cáo, ticket |
| **Member / Nhân viên** | Sử dụng chatbot, tra cứu tài liệu, tham gia dự án, chấm công |

<!--
SPEAKER NOTES (~30s)
- ICCP phục vụ 4 vai trò chính. Hai cấp quyền lớn: cấp hệ thống (admin của
  bên cung cấp dịch vụ) và cấp tổ chức (khách hàng).
-->

---

<!-- _class: lead -->
# 2. Problems
## Bài toán đặt ra

⏱ ~3 phút

---

# Các bài toán chính

1. **Tri thức nội bộ phân tán** — không có kênh tra cứu thống nhất.
2. **LLM công cộng không an toàn** — rò rỉ dữ liệu, không phân quyền.
3. **Phân quyền phức tạp** — cùng một tài liệu, mỗi vai trò chỉ
   được thấy phần phù hợp (theo tổ chức / dự án / role).
4. **Quản trị nội dung & quota** — chống prompt-injection, giới hạn
   sử dụng theo gói cước, theo dõi chi phí token.
5. **Vận hành dự án** — KPI, báo cáo định kỳ, ticket, chat nhóm thường
   nằm ở các SaaS khác nhau, dữ liệu không liên thông với chatbot.
6. **Triển khai SaaS đa khách hàng** — cô lập dữ liệu, tính phí,
   quản trị vòng đời subscription.

<!--
SPEAKER NOTES (~2 phút)
- Đây là 6 bài toán nhóm xác định rõ ngay từ đầu.
- Lưu ý điểm khác biệt: không chỉ làm chatbot, mà còn làm "nền tảng quản trị"
  để dữ liệu chatbot có ngữ cảnh dự án, KPI, ticket. Đây là điểm khác với
  các sản phẩm chỉ-RAG ngoài thị trường.
-->

---

# Yêu cầu phi chức năng

- **Multi-tenancy chặt:** dữ liệu các tổ chức không được lẫn nhau.
- **Streaming response:** chatbot phản hồi từng token, không bắt
  người dùng chờ cả câu trả lời.
- **Realtime:** thông báo, chat nhóm, billing event push tức thời.
- **Khả năng mở rộng:** thêm gói cước, model AI, kiểu báo cáo
  mà không cần viết lại lõi.
- **Quan sát hệ thống:** log có cấu trúc, trace_id xuyên suốt.

<!--
SPEAKER NOTES (~1 phút)
- Liệt kê các ràng buộc phi chức năng - những thứ ảnh hưởng tới kiến trúc.
-->

---

<!-- _class: lead -->
# 3. Solution & Main Project Goals
## Giải pháp & Mục tiêu đồ án

⏱ ~2 phút

---

# Giải pháp tổng thể

> **ICCP = Nền tảng SaaS multi-tenant gồm 4 dịch vụ độc lập**
> phục vụ chatbot RAG + quản trị tổ chức / dự án.

- **iccp_backend_core (NestJS)** — Xương sống nghiệp vụ:
  Auth, RBAC, tổ chức, dự án, tài liệu, billing, realtime.
- **iccp_be_ai (FastAPI + Celery)** — Lõi AI:
  RAG, ingest tài liệu, agent orchestration, streaming.
- **iccp_web (Next.js)** — Cổng người dùng cuối (đa-tenant theo URL).
- **iccp_admin_web (Next.js)** — Bảng điều khiển dành cho System Admin.

<!--
SPEAKER NOTES (~1 phút)
- Chỉ rõ tại sao chia 4 service: tách lõi AI (Python) khỏi nghiệp vụ
  (Node) để mỗi bên dùng đúng hệ sinh thái mạnh nhất, đồng thời
  scale độc lập (AI thường nặng GPU/embedding hơn nghiệp vụ).
-->

---

# Mục tiêu đồ án

- Xây dựng **end-to-end** từ đăng ký tổ chức → dùng chatbot →
  thanh toán gói cước.
- Triển khai **RAG có phân quyền** ở cấp metadata (tổ chức / dự án / role).
- Cài đặt **multi-tenant đầy đủ**: namespace vector DB, scope DB,
  quota theo tổ chức và theo người dùng.
- Tích hợp **thanh toán thật** qua PayOS, vòng đời subscription
  (trial → active → expire → renewal).
- Cung cấp **tooling vận hành**: ingest pipeline bất đồng bộ,
  job queue, websocket realtime, audit log.

<!--
SPEAKER NOTES (~1 phút)
- Khẳng định: đây không phải prototype, mà là một sản phẩm vận hành được
  với các vòng đời thật.
-->

---

<!-- _class: lead -->
# 4. Technologies
## Công nghệ sử dụng

⏱ ~3 phút

---

# Stack tổng quan

| Tầng | Công nghệ |
|---|---|
| **Frontend** | Next.js 16 (App Router), React 19, Redux Toolkit, TanStack Query, Tailwind CSS v4, shadcn/ui, next-intl, socket.io-client, TipTap, GrapesJS |
| **Backend nghiệp vụ** | NestJS 11, TypeORM, PostgreSQL 17, Redis, BullMQ, Socket.io, Passport (JWT), Swagger, Nodemailer, ImageKit |
| **Backend AI** | FastAPI, Celery, MongoDB, Pinecone, Redis, Google Gemini, LangChain text-splitter, PyMuPDF, python-docx, openpyxl, Tesseract OCR, OpenSearch |
| **DevOps** | Docker Compose (dev/prod), NGINX, GitHub Actions CI/CD (SSH deploy) |

<!--
SPEAKER NOTES (~1.5 phút)
- Nhấn mạnh chọn theo "đúng tool cho đúng việc": Node cho realtime + nghiệp vụ,
  Python cho AI, Next.js để vừa SSR vừa SPA.
- Chọn Postgres cho dữ liệu nghiệp vụ (quan hệ phức tạp), Mongo cho hội thoại
  (schema linh hoạt, ghi nhiều), Pinecone cho vector, Redis cho cache + queue.
-->

---

# Vì sao chọn các công nghệ này

- **NestJS:** module hoá rõ, sẵn DI, decorator cho RBAC/Swagger.
- **FastAPI + Celery:** async I/O cho streaming SSE, Celery cho
  ingest tài liệu nặng, retry idempotent.
- **Pinecone (namespace per org):** cách ly tenant ở tầng vector DB,
  rẻ và đơn giản hơn tự host.
- **Gemini (`gemini-2.5-flash` + embedding 768d):** phản hồi nhanh,
  chi phí thấp, hỗ trợ tiếng Việt tốt.
- **PostgreSQL + TypeORM transactional:** đảm bảo ACID cho
  nghiệp vụ tổ chức / billing.
- **Redis 3-DB:** cache, broker BullMQ, broker/back-end Celery.

<!--
SPEAKER NOTES (~1.5 phút)
- Mỗi gạch đầu dòng là một quyết định kỹ thuật có lý do.
- Khi hội đồng hỏi "tại sao chọn Pinecone", trả lời: namespace gốc cho
  multi-tenant, không phải tự build cách ly.
-->

---

<!-- _class: lead -->
# 5. System Architecture
## Kiến trúc hệ thống

⏱ ~4 phút

---

# Sơ đồ thành phần

```
   [iccp_web]                       [iccp_admin_web]
   (end-user)                       (system admin)
        │  JWT (Bearer) + x-organization-id     │
        └──────────────┬─────────────────────────┘
                       ▼
            ┌───────────────────────┐
            │  iccp_backend_core    │   NestJS · Postgres · Redis
            │  Auth · RBAC · Org    │   BullMQ · Socket.io · PayOS
            │  Project · Document   │
            │  Billing · Notify     │
            └─────────┬─────────────┘
   internal HTTP      │     JWT introspect
   (X-Internal-Key)   ▼
            ┌───────────────────────┐
            │     iccp_be_ai        │   FastAPI · Celery
            │  Orchestrator (SSE)   │   MongoDB · Redis
            │  Agents · Ingest      │   Pinecone · Gemini
            └───────────────────────┘
```

<!--
SPEAKER NOTES (~2 phút)
- Trình bày luồng: hai frontend gọi vào core; core là người gác cổng JWT,
  RBAC, dữ liệu nghiệp vụ.
- AI service không tự xác thực user mà gọi introspect về core (cache 120s
  trên Redis). Server-server call dùng X-Internal-Key.
- Đây là điểm "single source of truth": mọi quyết định phân quyền cuối cùng
  đều quy về core.
-->

---

# Kiến trúc bên trong AI service

```
POST /conversations/{id}/messages  (SSE)
        │
        ▼
   AgentOrchestrator
        │
        ├─► RouterAgent     (DOCUMENT_QUERY | TASK_QUERY | CHITCHAT)
        │
        ├─► RetrievalAgent  ──► Pinecone (namespace = org_{orgId},
        │                         metadata: access_scope, project_id, role_ids)
        │
        ├─► WebSearchAgent  ──► DuckDuckGo (mode = web | hybrid)
        │
        ├─► ChatAgent       ──► Gemini (stream tokens) + Citations
        │
        ├─► SuggestionAgent (gợi ý câu hỏi tiếp theo, async)
        │
        └─► AnalyticsAgent  (Celery, fire-forget)
```

<!--
SPEAKER NOTES (~1.5 phút)
- 4 chế độ: rag, web, hybrid, chitchat. Router tự chọn, người dùng có thể
  override.
- Streaming SSE để token chảy ngay - giống ChatGPT.
- Hai agent cuối là async: không chặn câu trả lời.
-->

---

# Pipeline ingest tài liệu

```
Core: POST /documents (upload)
        │
        ▼
Core gọi AI: POST /ingest/documents (X-Internal-Key)
        │
        ▼
Celery queue: "ingest"
        │
        ├─ Parse  : PyMuPDF / python-docx / openpyxl
        │           (Tesseract OCR fallback nếu trang text < 50 ký tự)
        ├─ Chunk  : RecursiveCharacterTextSplitter (separators VN-aware)
        ├─ Embed  : Gemini embedding 768d (cache Redis 24h theo SHA256)
        ├─ Upsert : Pinecone (namespace + metadata access scope)
        └─ Index  : OpenSearch (lexical, hỗ trợ hybrid sau này)
```

<!--
SPEAKER NOTES (~1 phút)
- Nhấn mạnh: ingest là idempotent, retry 3 lần - quan trọng cho sản phẩm thật.
- Cache embedding theo nội dung: nếu cùng đoạn text, không gọi Gemini lại
  → tiết kiệm chi phí.
-->

---

# Multi-tenancy & Phân quyền

- **Cách ly dữ liệu:**
  - Postgres: mọi entity có `organizationId`; query bám theo header
    `x-organization-id` qua decorator `@GetOrgId()`.
  - MongoDB: mọi collection có `organization_id`.
  - Pinecone: namespace = `org_{organization_id}`.
- **RBAC 3 cấp:** `SystemRole` (enum) · `Organization Role` · `Project Role`,
  cùng bảng `roles` phân biệt qua `isSystemRole / organizationId / projectId`.
- **Permission decorator:** `@RequirePermission(...)` + `PermissionGuard`.
- **Tài liệu:** `accessScope = system | organization | project | role`,
  metadata này theo cả vector ở Pinecone → filter ngay khi retrieve.

<!--
SPEAKER NOTES (~1.5 phút)
- Đây là phần "chất xám" của đồ án. Phân quyền không chỉ ở API mà còn
  cắm sâu vào tầng vector retrieval - tài liệu user không có quyền sẽ
  không bao giờ vào prompt LLM.
-->

---

<!-- _class: lead -->
# 6. Main Features
## Các tính năng chính

⏱ ~5 phút

---

# A. Tài khoản & Tổ chức

- Đăng ký / đăng nhập, xác thực OTP qua email, đặt lại mật khẩu.
- JWT access + refresh; client tự refresh khi 401 (interceptor).
- Tạo tổ chức, mời thành viên, cấu hình **working time / timezone**,
  branding, landing page tổ chức.
- **Landing-page builder** (GrapesJS) – kéo-thả thiết kế trang giới
  thiệu công khai cho từng tổ chức.

<!--
SPEAKER NOTES (~1 phút)
- Một tổ chức = một workspace ICCP. URL có dạng /tenant/{slug}/...
-->

---

# B. RBAC & Quản lý thành viên

- Bảng quyền hai cấp: tổ chức và dự án.
- Tạo role tuỳ biến, gán bộ permission cho role.
- Mời thành viên → flow accept invite, gán role mặc định.
- Component `<Can />` ở frontend ẩn/hiện UI theo permission.

<!--
SPEAKER NOTES (~30s)
-->

---

# C. Quản lý tài liệu & Ingest AI

- Upload PDF / DOCX / XLSX / TXT / MD; xem version, review, approval.
- Phân quyền theo `accessScope`: system / organization / project / role.
- Ingest bất đồng bộ qua Celery: parse → chunk → embed → Pinecone + OpenSearch.
- Kiểm tra **content policy** (LLM moderation + 35+ regex prompt-injection)
  ngay khi ingest và khi retrieve.

<!--
SPEAKER NOTES (~1 phút)
-->

---

# D. Chatbot RAG

- 4 chế độ: **rag · web · hybrid · chitchat** (Router tự chọn / user override).
- Streaming SSE (typed events: `token`, `done`, `suggestions`, `error`).
- Hiển thị **citations** (tên file, độ liên quan) và **web sources**.
- Gợi ý câu hỏi tiếp theo (SuggestionAgent).
- **Quota**:
  - User: 100 tin/ngày, 100K token/ngày.
  - Tổ chức: 1.000 tin/tháng, 10M token/tháng (mặc định, theo plan).
- Cancel bằng `AbortController`.

<!--
SPEAKER NOTES (~1.5 phút)
- Đây là tính năng "ngôi sao". Demo sẽ tập trung phần này.
-->

---

# E. Quản lý dự án

- Project board (task, subtask, assignee, worklog).
- Project KPI, member, role, document scope theo dự án.
- **Báo cáo định kỳ:** daily, periodic, quarterly (hỗ trợ tạo tự động
  qua BullMQ scheduled jobs).
- Ticket request: tạo, duyệt, comment, CC.
- Team chat: rich text TipTap, mention, realtime qua Socket.io.
- Audit log (admin), Google Drive sync (tab admin tổ chức).

<!--
SPEAKER NOTES (~1.5 phút)
- ICCP không chỉ là chatbot - nó là hệ tổ chức công việc, và chatbot
  có thể "đọc hiểu" được dữ liệu trong chính dự án đó.
-->

---

# F. Billing & Thanh toán

- Plan, subscription, invoice, transaction.
- Tích hợp **PayOS** (cổng thanh toán VN): tạo payment link, webhook,
  ghi nhận thanh toán → kích hoạt subscription.
- Vòng đời tự động qua BullMQ:
  - Hết hạn subscription
  - Nhắc gia hạn
  - Xử lý payment mồ côi (chuyển tiền nhưng chưa khớp)
  - Hết hạn trial

<!--
SPEAKER NOTES (~1 phút)
- Đây là phần khẳng định sản phẩm "thực chiến". Có cron, có webhook,
  có recovery cho payment mồ côi.
-->

---

# G. Realtime, Thông báo & Quản trị hệ thống

- Socket.io rooms: `user:{userId}`, chat, project, billing, ticket,
  notification.
- Notification campaigns (admin gửi thông báo theo tổ chức).
- **Admin web** (System Admin): users, organizations, roles,
  billing/plans, billing/subscriptions, billing/transactions, refund.
- Audit log, system health, GDrive sync status.
- Logging có `trace_id` xuyên suốt; Swagger tự sinh ở `/api-docs`.

<!--
SPEAKER NOTES (~1 phút)
-->

---

<!-- _class: lead -->
# 7. Demo Flow
## Kịch bản demo (~12–14 phút)

---

# Tổng quan demo

| # | Bước | ~Thời lượng |
|---|---|---|
| 1 | Đăng ký, xác thực OTP, tạo tổ chức | 1.5 phút |
| 2 | Mời thành viên, gán role | 1 phút |
| 3 | Upload tài liệu & quan sát ingest | 1.5 phút |
| 4 | Hỏi chatbot ở chế độ RAG (xem citation streaming) | 2 phút |
| 5 | Hỏi cùng câu với user role thấp hơn (kiểm tra phân quyền) | 1 phút |
| 6 | Chế độ hybrid (RAG + web search) | 1 phút |
| 7 | Tạo dự án, task, KPI, daily report | 2 phút |
| 8 | Mua gói trả phí qua PayOS (sandbox) | 1.5 phút |
| 9 | Chuyển sang Admin Web: quản lý plan, refund giao dịch | 1.5 phút |

<!--
SPEAKER NOTES
- Đặt timer trong đầu. Nếu chậm, cắt bước 6 và 9 trước. Bước 4-5-8 là
  "must-show".
-->

---

# Demo 1–2 · Onboard tổ chức

**Bước thực hiện:**
1. Vào `iccp_web`, đăng ký bằng email thật.
2. Nhập OTP nhận qua email → kích hoạt tài khoản.
3. Tạo tổ chức "Acme" → vào URL `tenant/acme`.
4. Tab _Organization Members_ → mời 1 email khác, gán role `Member`.

**Điểm cần nói khi demo:**
- "Mỗi tổ chức là một workspace cô lập, URL gắn slug."
- "Quyền do org-admin gán; mời gửi qua email + token một lần."

<!--
SPEAKER NOTES
- Chuẩn bị sẵn email phụ để hứng OTP nhanh, không lúng túng.
-->

---

# Demo 3 · Upload tài liệu & ingest

**Bước thực hiện:**
1. Vào `Documents` → upload `policy.pdf` (~10 trang).
2. Mở dev console hoặc tab admin để show **status job ingest**:
   `pending → started → success`.
3. Mở Pinecone (hoặc log) thoáng qua để show vector mới có
   namespace `org_<id>`.

**Điểm cần nói:**
- "File qua Celery: parse → chunk → embed (cache Redis) → upsert."
- "Mỗi vector mang metadata `accessScope` để retrieve có lọc."

<!--
SPEAKER NOTES
- Nếu Pinecone UI chậm, chỉ show log container Celery là đủ.
-->

---

# Demo 4 · Hỏi chatbot (RAG)

**Bước thực hiện:**
1. Vào tab `Chatbot` → tạo conversation mới.
2. Hỏi: _"Quy định OT trong công ty là gì?"_ (câu trả lời nằm trong
   `policy.pdf`).
3. Quan sát: token chảy theo SSE; xuất hiện **Citations**
   (tên file + % liên quan) và gợi ý câu hỏi tiếp theo.

**Điểm cần nói:**
- "Đây là streaming thật - không phải chờ rồi hiện."
- "Citations chứng minh câu trả lời truy nguyên từ tài liệu, không
  phải LLM bịa."

<!--
SPEAKER NOTES
- Câu hỏi nên có đáp án rõ ràng trong tài liệu để citation đẹp.
-->

---

# Demo 5 · Phân quyền retrieval

**Bước thực hiện:**
1. Đặt `accessScope = project` cho `policy.pdf`, gán vào dự án A.
2. Đăng nhập user khác, **không** ở dự án A.
3. Hỏi cùng câu trên: chatbot trả lời _"Không tìm thấy tài liệu phù hợp"_
   hoặc rơi sang chế độ chitchat.
4. Cho user vào dự án A → hỏi lại → có câu trả lời.

**Điểm cần nói:**
- "Phân quyền không chỉ ở API - nó cắm vào tầng vector. User không có
  quyền thì tài liệu không bao giờ vào prompt LLM."

<!--
SPEAKER NOTES
- Đây là điểm thuyết phục nhất về tính nghiêm túc của hệ thống.
-->

---

# Demo 6 · Hybrid (RAG + Web)

**Bước thực hiện:**
1. Hỏi câu cần thông tin ngoài: _"So sánh quy định OT công ty với
   Bộ luật Lao động Việt Nam mới nhất."_
2. Quan sát: response có cả **Citations** (nội bộ) và **Web sources**
   (DuckDuckGo) trong cùng một câu trả lời.

<!--
SPEAKER NOTES (~30s)
- Cho thấy Router tự chuyển mode khi câu hỏi vượt phạm vi nội bộ.
-->

---

# Demo 7 · Quản lý dự án

**Bước thực hiện:**
1. Tạo dự án "Mobile App v2".
2. Tạo task → assignee, subtask, worklog (chấm giờ).
3. Mở tab **KPI** → set target.
4. Mở tab **Reports / Daily** → xem report tự sinh từ worklog.

**Điểm cần nói:**
- "Worklog → KPI → daily/periodic report là một mạch dữ liệu, scheduled
  qua BullMQ."

<!--
SPEAKER NOTES
- Đi nhanh, mục tiêu cho hội đồng thấy phạm vi sản phẩm rộng hơn chatbot.
-->

---

# Demo 8 · Thanh toán PayOS

**Bước thực hiện:**
1. Vào tab `Billing` của tổ chức → chọn plan Pro.
2. Click _Thanh toán_ → mở payment link PayOS sandbox.
3. Quét QR / chọn ngân hàng test → trả thành công.
4. Quay lại app → subscription chuyển sang `active`, quota nâng lên.

**Điểm cần nói:**
- "Webhook PayOS đẩy về core, BullMQ kích hoạt subscription."

<!--
SPEAKER NOTES
- Chuẩn bị tài khoản sandbox sẵn. Có sẵn fallback (screenshot/video) nếu
  network/PayOS lỗi đột xuất.
-->

---

# Demo 9 · Admin Web

**Bước thực hiện:**
1. Vào `iccp_admin_web` (tài khoản System Admin).
2. Tab `Organizations` → xem tổ chức Acme vừa tạo.
3. Tab `Billing / Transactions` → tìm giao dịch vừa thanh toán → bấm Refund.
4. Quay lại `iccp_web` → tổ chức nhận thông báo refund realtime
   (Socket.io).

<!--
SPEAKER NOTES
- Kết thúc demo bằng một đường khép kín: user → admin → user, để minh
  hoạ tính hệ thống.
-->

---

<!-- _class: lead -->
# 8. Achievements
## Kết quả đạt được

⏱ ~2 phút

---

# Kết quả

- **4 dịch vụ** chạy độc lập, đã đóng gói Docker và có CI/CD
  qua GitHub Actions (SSH deploy, NGINX reverse proxy).
- **Backend nghiệp vụ:** ~25 module NestJS, **66 migration**
  TypeORM, BullMQ với nhiều queue billing/analytics/notification.
- **Backend AI:** **8 agent** chuyên trách, orchestrator streaming SSE,
  ingest pipeline async, **16 file test** pytest (yêu cầu coverage > 60%).
- **Frontend end-user:** App Router đa-tenant, ~25 nhóm tính năng,
  i18n EN/VI, realtime Socket.io, GrapesJS landing builder, TipTap
  rich text.
- **Frontend admin:** đầy đủ flow quản lý plan, subscription, refund,
  có refresh-token interceptor.
- **Tích hợp thật:** Gemini, Pinecone, PayOS, ImageKit, OpenSearch.

<!--
SPEAKER NOTES (~2 phút)
- Liệt kê con số đo được. Tránh nói "rất nhiều" - dùng số cụ thể.
-->

---

# Điểm nổi bật về kỹ thuật

- **Multi-tenancy 3 tầng:** Postgres (`organizationId`) + MongoDB
  (`organization_id`) + Pinecone (namespace per org).
- **RAG có phân quyền** đến tận tầng vector (filter metadata
  `access_scope`, `project_id`, `role_ids`).
- **Defense-in-depth nội dung:** moderation LLM + 35+ regex
  prompt-injection áp cả lúc ingest, retrieve, và input người dùng.
- **Quota nhiều chiều:** message/tháng cho org, message+token/ngày
  cho user, reset theo timezone Asia/Ho_Chi_Minh.
- **Realtime end-to-end:** từ event nghiệp vụ → Bull → Socket.io →
  React.
- **Cache embedding** giảm chi phí Gemini (TTL 24h, key SHA256 nội dung).

<!--
SPEAKER NOTES (~1 phút)
-->

---

<!-- _class: lead -->
# 9. Limitations & Future Work
## Hạn chế & Hướng phát triển

⏱ ~2 phút

---

# Hạn chế hiện tại

- **Reranking & Query expansion** đã có flag cấu hình nhưng
  chưa cài đặt mô hình thực tế.
- **Phụ thuộc dịch vụ ngoài** (Gemini, Pinecone, PayOS) — chưa có
  fallback/multi-provider cho LLM hoặc vector DB.
- **Test coverage** tập trung ở AI service; backend nghiệp vụ và
  frontend chưa có bộ test tự động.
- **Hiệu năng ingest** chưa benchmark với tài liệu rất lớn
  (>100MB / nhiều trăm trang).
- **Quan sát hệ thống** dừng ở structured log; chưa có dashboard
  metric (Prometheus/Grafana) đầy đủ.

<!--
SPEAKER NOTES (~1 phút)
- Trung thực với hội đồng. Liệt kê đúng những gì chưa làm.
-->

---

# Hướng phát triển

- **Reranker** (Cohere / Cross-encoder) + Query expansion để cải
  thiện độ chính xác RAG.
- **Multi-LLM gateway** (Gemini / OpenAI / local) chọn theo plan
  và theo loại câu hỏi.
- **Hybrid search** kết hợp Pinecone + OpenSearch (BM25) để bắt
  cả truy vấn ngữ nghĩa và truy vấn từ khoá.
- **Mobile app** dùng cùng API.
- **Workflow tự động hoá** (no-code) trên dữ liệu dự án + LLM.
- **Observability:** OpenTelemetry, Prometheus, Grafana, alert SLA.
- **Mở rộng test** + e2e (Playwright cho web, Pact cho contract).

<!--
SPEAKER NOTES (~1 phút)
-->

---

<!-- _class: lead -->
# 10. Conclusion
## Kết luận

⏱ ~1 phút

---

# Kết luận

- ICCP là một **nền tảng SaaS hoàn chỉnh** chứ không chỉ là một
  chatbot demo: bao trùm onboarding, RBAC, dự án, KPI, ticket,
  thanh toán, RAG có phân quyền, và quản trị hệ thống.
- Kiến trúc **4 dịch vụ tách biệt** giúp mỗi tầng dùng đúng công
  nghệ mạnh nhất và scale độc lập.
- Đồ án đã chứng minh khả năng thiết kế và triển khai một hệ
  thống multi-tenant có **vòng đời thật**: từ đăng ký → nạp dữ
  liệu → trả lời người dùng → thu phí → vận hành.

<br>

<center><b>Em xin cảm ơn hội đồng đã lắng nghe.</b></center>
<center><b>Rất mong nhận được câu hỏi và góp ý.</b></center>

<!--
SPEAKER NOTES (~45s)
- Chốt lại 3 ý: phạm vi rộng, kiến trúc rõ ràng, vòng đời thực.
- Mời hỏi đáp.
-->

---

<!-- _class: lead -->
# Q & A

Cảm ơn hội đồng.

<!--
============================================================
PHỤ LỤC - PHẦN KHÔNG TRÌNH CHIẾU
============================================================
GỢI Ý CÂU HỎI HỘI ĐỒNG CÓ THỂ HỎI:

1. "Tại sao chia 4 service mà không 1 monolith?"
   → AI workload (Python, Celery) khác hẳn nghiệp vụ (Node, realtime);
     scale độc lập; team có thể làm song song. Chấp nhận đánh đổi
     phức tạp deploy bằng Docker Compose + CI/CD.

2. "Pinecone vs tự build vector DB (pgvector, Milvus)?"
   → Pinecone có namespace gốc cho multi-tenant, vận hành managed,
     tiết kiệm thời gian sinh viên. Có thể migrate sang pgvector
     khi đủ tải.

3. "Phân quyền tài liệu trong RAG cụ thể như thế nào?"
   → Mỗi vector trong Pinecone gắn metadata accessScope/projectId/
     roleIds. Trước khi retrieve, build filter từ JWT của user
     (orgId, dự án user thuộc, role user có) → Pinecone chỉ trả vector
     hợp lệ. Defense-in-depth thêm WHERE ở Postgres khi load metadata
     hiển thị citation.

4. "Chống prompt-injection thế nào?"
   → 2 lớp: regex 35+ pattern + LLM moderation. Áp khi ingest tài liệu
     (chống tài liệu chứa injection), khi user gõ input, và trên chunks
     trước khi ghép prompt.

5. "Quota tính toán ở đâu, có race condition không?"
   → QuotaService.check_and_increment trong Mongo trước mỗi request.
     Idempotent: counter dùng atomic update.

6. "Refresh token bảo mật ra sao?"
   → Refresh token có secret riêng, lifetime dài; backend verify
     chữ ký + lookup. Có thể revoke per-user (logout).

7. "Streaming SSE qua proxy/NGINX có buffering không?"
   → KHÔNG dùng GZipMiddleware ở FastAPI. NGINX cấu hình tắt
     buffer cho endpoint /messages.

8. "Nếu Gemini hết quota / rate-limit thì sao?"
   → Hiện chưa có fallback; ghi vào hướng phát triển (multi-LLM
     gateway). Có cache embedding giúp giảm gọi.

9. "Tại sao có cả MongoDB và Postgres?"
   → Postgres cho dữ liệu nghiệp vụ quan hệ phức tạp (org, RBAC,
     billing). Mongo cho conversation + message: schema linh hoạt,
     ghi rất nhiều, đọc theo thread.

10. "Có audit log không?"
    → Có module audit + tab GUI ở admin của tổ chức.

============================================================
CHECKLIST CHUẨN BỊ TRƯỚC HÔM BẢO VỆ
============================================================
[ ] 2 tài khoản email sẵn sàng cho demo OTP và mời thành viên
[ ] Tổ chức demo (Acme) đã được seed sẵn 1 dự án + vài tài liệu
    mẫu - phòng khi network chậm
[ ] Tài khoản PayOS sandbox + thẻ test
[ ] Tài khoản System Admin trên iccp_admin_web
[ ] Bản chụp màn hình / video dự phòng cho:
       (a) ingest pipeline
       (b) PayOS payment link
       (c) refund từ admin
[ ] Mở sẵn 4 cửa sổ trình duyệt (user1, user2, admin, terminal log)
[ ] Đặt log Celery + log AI service ở 2 terminal lớn để show streaming
[ ] Đảm bảo Pinecone & Gemini API key còn quota
[ ] Tắt extension trình duyệt (uBlock, Vimium…) tránh phá hotkey
[ ] Test toàn flow demo end-to-end ít nhất 2 lần ngày trước
============================================================
-->
