## Context

Node S3 hiện có chủ yếu trả về danh sách phẳng (ListObjectsV2) và chưa chuẩn hóa dữ liệu cho tree view. Người dùng cần duyệt theo thư mục giả lập (Prefix/Delimiter) và phân trang bằng MaxKeys để tránh tải toàn bộ đối tượng, đồng thời UI cần biết node là folder hay file và có còn trang tiếp theo hay không.

## Goals / Non-Goals

**Goals:**
- Cung cấp thao tác list theo cây (folder/file) dựa trên Prefix + Delimiter.
- Hỗ trợ phân trang với MaxKeys và ContinuationToken.
- Chuẩn hóa output để UI dễ dựng tree view (node type, key, path, hasMore/nextToken).

**Non-Goals:**
- Không thực hiện list đệ quy toàn bộ cây trong một lần gọi.
- Không thay đổi hành vi list phẳng hiện tại nếu không chọn chế độ tree.
- Không bổ sung thao tác quản lý (rename/move/delete) trong phạm vi này.

## Decisions

- **Sử dụng ListObjectsV2 với Delimiter “/”** để lấy các thư mục giả lập qua `CommonPrefixes` và tệp qua `Contents`. Lý do: đúng mô hình thư mục của S3 và hỗ trợ phân trang.
- **Thiết kế output tree view theo “children of prefix”**: mỗi lần gọi trả về các node con trực tiếp của `Prefix` (folder + file). Lý do: UI tree view cần tải lười (lazy load) theo nhánh.
- **Thêm chế độ/operation mới cho tree list** thay vì thay đổi output list hiện tại. Lý do: tránh breaking change cho workflow hiện có.
- **Chuẩn hóa trường phân trang** (`maxKeys`, `nextToken`, `isTruncated`) trong output để UI quyết định có tải tiếp hay không.

## Risks / Trade-offs

- [Kích thước response lớn] → Giới hạn `MaxKeys` mặc định hợp lý và cho phép người dùng cấu hình.
- [Nhầm lẫn folder/file khi key trùng prefix] → Loại bỏ đối tượng có key bằng chính prefix khi render folder node.
- [Hiệu năng khi duyệt sâu] → Khuyến nghị lazy-load theo nhánh và cache phía UI nếu cần.

## Migration Plan

- Bổ sung operation/option mới (ví dụ: “List Tree”) và giữ nguyên hành vi cũ.
- Không cần migrate dữ liệu; chỉ cập nhật node schema và tài liệu.
- Rollback bằng cách tắt/loại bỏ operation mới nếu phát sinh lỗi.

## Open Questions

- Chuẩn output tree view có cần thêm metadata (size, lastModified) cho file node không?
- UI có cần trường “hasChildren” riêng cho folder hay chỉ dựa vào lần gọi tiếp theo?
