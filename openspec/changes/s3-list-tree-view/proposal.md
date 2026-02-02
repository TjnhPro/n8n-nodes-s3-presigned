## Why

Hiện tại thao tác list của S3 chỉ trả về danh sách phẳng hoặc thiếu ngữ cảnh thư mục giả lập, gây khó khăn khi hiển thị dạng cây trong UI. Cần bổ sung khả năng list theo cây (folder/file) với phân trang bằng MaxKeys để phục vụ trải nghiệm duyệt (browse) ổn định.

## What Changes

- Bổ sung khả năng list S3 theo cấu trúc cây (folder + file) dựa trên Prefix/Delimiter.
- Thêm hỗ trợ phân trang bằng MaxKeys và tiếp tục bằng ContinuationToken khi duyệt cây.
- Chuẩn hóa dữ liệu trả về để phù hợp hiển thị tree view (node folder/file, path, children/hasMore).

## Capabilities

### New Capabilities
- `s3-list-tree`: Hỗ trợ list S3 theo dạng cây thư mục/tệp với phân trang MaxKeys để phục vụ tree view.

### Modified Capabilities
- (trống)

## Impact

- Ảnh hưởng node S3 hiện có (thao tác list) và schema dữ liệu output.
- Tác động đến logic gọi AWS SDK (ListObjectsV2) với Prefix, Delimiter, MaxKeys, ContinuationToken.
- Có thể cần cập nhật UI mapping/output của node trong n8n để hỗ trợ tree view.
