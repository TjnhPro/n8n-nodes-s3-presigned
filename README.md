# n8n-nodes-s3-presigned

This is an n8n community node. It generates presigned S3 upload URLs (PUT only) using credentials stored in n8n.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

[Installation](#installation)  
[Operations](#operations)  
[Credentials](#credentials)  
[Compatibility](#compatibility)  
[Usage](#usage)  
[Resources](#resources)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

## Operations

- Generate presigned S3 upload URL (PUT)
- List S3 folders/files (ListObjectsV2, tree view)

## Credentials

This node uses a package-local credential named **S3 Presigned API** with:

- **Access Key ID**
- **Secret Access Key**
- **Region**
- **Session Token** (optional; required for temporary STS credentials)

## Compatibility

Designed for n8n community nodes with Node CLI tooling. If you encounter version issues, please open an issue with your n8n version.

## Usage

1. Add the **S3 Presigned Upload** node.
2. Configure credentials (Access Key, Secret, Region, optional Session Token).
3. Choose **Operation**:
   - **Presigned Upload (PUT)**: set Bucket, Object Key, and Expires In (seconds).
   - **List Tree (ListObjectsV2)**: set Bucket, Prefix, Delimiter, Max Keys (optional Continuation Token).
   - Bucket có dấu chấm (`.`) sẽ tự dùng path-style để tránh lỗi SSL.
4. (Optional) Set Content Type, Content Disposition, ACL, and Metadata for upload.
5. The node outputs (upload):
   - `url`: presigned URL
   - `method`: `PUT`
   - `headers`: headers to send with the PUT
   - `expiresAt`: ISO timestamp
6. The node outputs (list):
   - `items`: folders first, then files (ready for tree view UI)
   - `pagination.hasMore`: boolean
   - `pagination.nextToken`: string (pass to Continuation Token)

Example PUT request (pseudo):

```bash
curl -X PUT "{{$json.url}}" \
  -H "Content-Type: {{$json.headers['Content-Type']}}" \
  -H "Content-Disposition: {{$json.headers['Content-Disposition']}}" \
  -H "x-amz-acl: {{$json.headers['x-amz-acl']}}" \
  -H "x-amz-meta-user: {{$json.headers['x-amz-meta-user']}}" \
  --data-binary @file.bin
```

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- [Amazon S3 presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html)
- [PutObject API](https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutObject.html)
