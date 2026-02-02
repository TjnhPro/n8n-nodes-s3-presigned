## 1. Project setup

- [x] 1.1 Identify or create S3 credential type to reuse n8n S3 credentials (or reference built-in if available)
- [x] 1.2 Add node entry and credentials to `package.json` `n8n.nodes` / `n8n.credentials`

## 2. Node definition

- [x] 2.1 Create new node file for S3 Presigned Upload with description, inputs, and outputs
- [x] 2.2 Define operation parameters: mode (PUT/POST), bucket, key, expires, content type, ACL, metadata
- [x] 2.3 Implement validation for required inputs and expiration bounds

## 3. Presigning implementation

- [x] 3.1 Add/verify AWS SDK v3 dependencies for presigning utilities
- [x] 3.2 Implement PUT presigned URL using `PutObjectCommand` and `getSignedUrl`
- [x] 3.3 Implement POST presigned form using `createPresignedPost`
- [x] 3.4 Return normalized response shape for downstream nodes (url, method, headers/fields, expiresAt)

## 4. Error handling and tests

- [x] 4.1 Surface SDK errors with actionable messages
- [ ] 4.2 Add basic unit or integration tests for PUT/POST outputs
- [ ] 4.3 Verify node works in `npm run dev` with a sample workflow
