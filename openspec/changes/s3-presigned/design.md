## Context

This package currently provides S3-related nodes but does not generate presigned upload links. Users want to leverage existing n8n S3 credentials to let external clients upload directly to S3 with short-lived access.

## Goals / Non-Goals

**Goals:**
- Generate presigned upload URLs using n8n S3 credentials.
- Support required upload parameters (bucket, key, expiry) and optional content type/metadata/ACL.
- Return a response that includes URL plus required headers (PUT) or form fields (POST).

**Non-Goals:**
- Managing multipart upload workflows.
- Building a complete file-upload service or proxy.
- Persisting presigned links beyond the node execution.

## Decisions

- Use AWS SDK v3 presigning utilities to align with modern n8n dependencies and avoid legacy v2.
  - Alternative: AWS SDK v2 `getSignedUrl` (rejected: larger dependency, deprecated patterns).
- Provide a single operation with a mode selector (PUT or POST) to keep UX simple while covering both upload styles.
  - Alternative: separate nodes/operations for PUT vs POST (rejected: more surface area without strong need).
- Use n8n S3 credentials (access key, secret, region, optional session token) from the existing credential type.
  - Alternative: add new credential type (rejected: unnecessary duplication).

## Risks / Trade-offs

- [Incorrect upload parameters] ? Validate input (expiry bounds, required fields) and surface AWS SDK errors clearly.
- [Security leakage of credentials] ? Ensure only presigned data is returned, never raw keys.
- [Inconsistent client behavior] ? Provide clear output structure for both PUT and POST so downstream nodes can use it reliably.

## Migration Plan

- No migration required; new operation is additive.
- If new dependencies are added, update package.json and rebuild.

## Open Questions

- Should POST be enabled by default, or only when the user selects POST mode?
- What maximum expiration should be enforced to align with AWS limits?
