## 1. Chuẩn bị

- [x] 1.1 Rà soát node S3 hiện tại và vị trí triển khai thao tác list
- [x] 1.2 Xác định schema output hiện có và điểm mở rộng cho tree view

## 2. Core list tree

- [x] 2.1 Thêm operation/chế độ “List Tree” vào node S3
- [x] 2.2 Implement gọi ListObjectsV2 với Prefix, Delimiter, MaxKeys, ContinuationToken
- [x] 2.3 Lọc bỏ object có key trùng prefix hiện tại

## 3. Chuẩn hóa output

- [x] 3.1 Mapping CommonPrefixes thành node folder (type, key, path, name)
- [x] 3.2 Mapping Contents thành node file (type, key, path, name)
- [x] 3.3 Trả về thông tin phân trang (isTruncated, nextToken, maxKeys)

## 4. Hoàn thiện và kiểm tra

- [ ] 4.1 Thêm/điều chỉnh test hoặc fixture cho list tree nếu có framework hiện hữu
- [x] 4.2 Cập nhật README hoặc mô tả node cho chế độ List Tree
