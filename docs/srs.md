TỔNG QUAN DỰ ÁN
Internal Consulting Chatbot Platform for Businesses Using RAG (ICCP)

1. Giới thiệu chung
Trong bối cảnh doanh nghiệp ngày càng phụ thuộc vào tài liệu số và quy trình nội bộ phức tạp, việc truy cập và khai thác tri thức nội bộ vẫn còn nhiều hạn chế. Nhân viên thường gặp khó khăn khi tìm kiếm thông tin về quy định nhân sự, quy trình vận hành, hoặc hướng dẫn kỹ thuật, dẫn đến việc lặp lại các câu hỏi và gia tăng tải cho bộ phận HR và IT.
Dự án ICCP (Internal Consulting Chatbot Platform) được xây dựng nhằm cung cấp một nền tảng phần mềm dạng Software-as-a-Service (SaaS), cho phép doanh nghiệp triển khai chatbot tư vấn nội bộ dựa trên Retrieval-Augmented Generation (RAG). Nền tảng hỗ trợ nhiều doanh nghiệp (multi-tenant), đảm bảo dữ liệu được cách ly tuyệt đối giữa các tổ chức, đồng thời cho phép nhân viên truy vấn tri thức nội bộ thông qua giao diện hội thoại tự nhiên bằng tiếng Việt.

2. Mục tiêu dự án
Dự án hướng đến các mục tiêu chính sau:
* Xây dựng nền tảng chatbot tư vấn nội bộ cho doanh nghiệp dựa trên RAG
* Hỗ trợ mô hình multi-tenant, mỗi doanh nghiệp hoạt động độc lập
* Giảm tải công việc cho bộ phận HR/IT thông qua tự động hóa trả lời câu hỏi
* Cung cấp khả năng quản lý người dùng, vai trò và quyền truy cập theo tổ chức
* Tích hợp quản lý dự án và công việc nội bộ trong doanh nghiệp
* Hỗ trợ mô hình đăng ký sử dụng và quản lý gói dịch vụ

3. Đối tượng sử dụng hệ thống
Hệ thống ICCP phục vụ các nhóm người dùng sau:
3.1. Người dùng cuối (Employee)
* Là nhân viên thuộc doanh nghiệp đã đăng ký ICCP
* Sử dụng chatbot để tra cứu thông tin nội bộ
* Tham gia các dự án và thực hiện công việc được giao
3.2. Quản trị tổ chức (Organization Owner / Admin – HR/IT)
* Đại diện doanh nghiệp đăng ký và sử dụng hệ thống
* Quản lý nhân sự, vai trò, quyền truy cập
* Quản lý tài liệu nội bộ và dữ liệu tri thức
* Quản lý gói dịch vụ và thanh toán
* Quản lý tài liệu nội bộ trong dự án và cho phép truy xuất tài liệu
* Theo dõi thống kê và hiệu quả sử dụng chatbot
3.3. Quản lý dự án (Project Manager)
* Tạo và quản lý các dự án nội bộ
* PM upload tài liệu, phân loại, tag, và gán cho người dùng
* PM có thể gán vai trò cho người dùng trong dự án
* Phân công công việc cho nhân viên
* Theo dõi tiến độ và báo cáo
3.4. Quản trị hệ thống (Platform Administrator)
* Quản lý toàn bộ nền tảng ICCP
* Giám sát các doanh nghiệp (tenant)
* Cấu hình chính sách hệ thống và gói dịch vụ

4. Chức năng chính của hệ thống
4.1. Quản lý tài khoản và tổ chức (Authentication & Tenant Management)
* Cho phép người dùng đăng ký tài khoản cá nhân
* Cho phép người dùng đã xác thực tạo doanh nghiệp (organization/tenant)
* Người tạo doanh nghiệp trở thành Organization Owner
* Quản trị tổ chức có thể mời nhân viên tham gia bằng email
* Một người dùng có thể thuộc nhiều tổ chức (mở rộng)

4.2. Quản lý vai trò và phân quyền (RBAC)
* Áp dụng mô hình Role-Based Access Control
* Permission được định nghĩa cố định ở cấp hệ thống
* Doanh nghiệp có thể:
    * tạo role
    * gán permission cho role
    * gán role cho người dùng theo scope (organization / project)
* Đảm bảo kiểm soát truy cập và bảo mật dữ liệu

4.3. Quản lý tài liệu và tri thức nội bộ
* Cho phép quản trị tổ chức upload, chỉnh sửa, phân loại tài liệu
* Hỗ trợ tài liệu HR, IT, quy trình, hướng dẫn, chính sách
* Thiết lập phạm vi truy cập tài liệu:
    * toàn tổ chức
    * theo dự án
    * theo vai trò
* Theo dõi trạng thái xử lý và indexing tài liệu

4.4. Chatbot tư vấn nội bộ sử dụng RAG
* Nhân viên đặt câu hỏi bằng ngôn ngữ tự nhiên (tiếng Việt)
* Hệ thống thực hiện:
    * truy xuất tài liệu liên quan (retrieval)
    * tạo câu trả lời dựa trên nội dung truy xuất (generation)
* Câu trả lời đi kèm:
    * trích dẫn nguồn
    * đoạn nội dung tham chiếu
* Lịch sử hội thoại được lưu theo từng người dùng và tổ chức
* Cho phép đánh giá chất lượng câu trả lời

4.5. Quản lý dự án và công việc nội bộ
* Cho phép tạo và quản lý các dự án trong doanh nghiệp
* Cho phép nhân viên có thể chat với chat bot với tài liệu trong dự án do PM upload
* Phân công công việc cho nhân viên
* Nhân viên cập nhật tiến độ và báo cáo
* Quản lý dự án theo dõi trạng thái và hiệu suất làm việc

4.6. Thống kê và phân tích (Analytics)
* Thống kê câu hỏi được hỏi nhiều nhất
* Theo dõi tài liệu được tham chiếu nhiều
* Phát hiện câu trả lời có độ tin cậy thấp
* Hỗ trợ cải thiện chất lượng tri thức nội bộ

4.7. Quản lý đăng ký và gói dịch vụ (Subscription & Billing)
* Doanh nghiệp lựa chọn gói dịch vụ (Starter / Standard / Enterprise)
* Quản lý thông tin thanh toán và hóa đơn
* Theo dõi thời hạn và trạng thái gói dịch vụ
* Giới hạn tài nguyên theo gói:
    * số người dùng
    * số tài liệu
    * dung lượng lưu trữ

5. Yêu cầu phi chức năng
* Hỗ trợ tiếng Việt mặc định
* Đảm bảo cách ly dữ liệu giữa các doanh nghiệp
* Khả năng mở rộng cho nhiều doanh nghiệp đồng thời
* Giao diện web thân thiện, responsive
* Đảm bảo bảo mật và kiểm soát truy cập

6. Phạm vi triển khai (MVP)
Trong phạm vi đồ án, dự án tập trung vào:
* Đăng ký tài khoản và tạo tổ chức
* Quản lý user, role, permission
* Upload tài liệu và RAG chatbot
* Quản lý dự án cơ bản
* Giao diện web cho người dùng và quản trị
Các tính năng nâng cao như mobile app native, voice chatbot, fine-tuning mô hình sẽ được đề xuất cho giai đoạn phát triển sau.

