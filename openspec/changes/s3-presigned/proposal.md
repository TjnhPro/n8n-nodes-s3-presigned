## Why

Users need to upload files directly to S3 without exposing long-lived credentials in workflows. Using n8n's stored S3 credentials to generate presigned upload links enables secure, temporary access and improves workflow flexibility.

## What Changes

- Add a new capability to generate presigned S3 upload URLs using existing n8n S3 credentials.
- Support configuration of bucket, object key, content type, expiration, and optional metadata/ACL in the presigned request.
- Return a structured response containing the URL and required form fields (if using POST) or headers (if using PUT).

## Capabilities

### New Capabilities
- `s3-presigned-upload`: Generate presigned S3 upload links from n8n S3 credentials with configurable upload parameters.

### Modified Capabilities
- (none)

## Impact

- New node/operation behavior in the S3 Presigned package.
- Uses n8n credential system for AWS access key/secret and region.
- Depends on AWS SDK presigning utilities.
