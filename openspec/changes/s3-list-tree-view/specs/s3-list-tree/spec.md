## ADDED Requirements

### Requirement: List tree theo prefix và delimiter
Hệ thống SHALL cung cấp thao tác list S3 theo dạng cây bằng cách chấp nhận `prefix` và `delimiter` để trả về các node con trực tiếp.

#### Scenario: List con trực tiếp của một prefix
- **WHEN** người dùng gọi list tree với `prefix` = `images/` và `delimiter` = `/`
- **THEN** hệ thống trả về các folder trong `CommonPrefixes` và các file trong `Contents` thuộc cấp trực tiếp của `images/`

### Requirement: Phân trang bằng MaxKeys và ContinuationToken
Hệ thống SHALL hỗ trợ `maxKeys` để giới hạn số lượng kết quả và trả về `nextToken` khi còn dữ liệu.

#### Scenario: Có trang tiếp theo
- **WHEN** số lượng kết quả vượt quá `maxKeys`
- **THEN** hệ thống trả về `isTruncated = true` và `nextToken` để lấy trang kế tiếp

### Requirement: Chuẩn hóa cấu trúc node tree view
Hệ thống SHALL chuẩn hóa mỗi phần tử trả về với các trường tối thiểu: `type` (folder|file), `key`, `path`, và `name`.

#### Scenario: Node folder
- **WHEN** một prefix con được trả về từ S3
- **THEN** hệ thống tạo node với `type = folder` và `key/path` tương ứng với prefix con

### Requirement: Loại bỏ node trùng prefix hiện tại
Hệ thống SHALL không trả về file có key trùng chính `prefix` hiện tại để tránh hiển thị folder như file.

#### Scenario: Key trùng prefix
- **WHEN** S3 trả về một object có `key` bằng đúng `prefix` hiện tại
- **THEN** hệ thống loại bỏ object đó khỏi danh sách file
