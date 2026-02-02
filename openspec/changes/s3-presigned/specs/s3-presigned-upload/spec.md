## ADDED Requirements

### Requirement: Generate presigned upload data
The system SHALL generate presigned upload data using the configured n8n S3 credentials, including URL, HTTP method, and any required headers or form fields.

#### Scenario: Generate PUT presigned URL
- **WHEN** the user selects upload mode PUT with bucket, key, and expiration
- **THEN** the system returns a URL, method PUT, and any required headers for the upload

#### Scenario: Generate POST presigned form
- **WHEN** the user selects upload mode POST with bucket, key, and expiration
- **THEN** the system returns a URL, method POST, and required form fields for the upload

### Requirement: Required inputs validation
The system MUST require bucket, object key, and expiration inputs before generating presigned upload data.

#### Scenario: Missing required input
- **WHEN** bucket or key or expiration is missing
- **THEN** the system returns a validation error and does not generate a presigned link

### Requirement: Optional upload parameters
The system SHALL allow optional content type, ACL, and metadata to be included in the presigned request.

#### Scenario: Include optional parameters
- **WHEN** content type, ACL, or metadata are provided
- **THEN** the presigned data includes constraints or headers reflecting those values

### Requirement: Credential usage
The system MUST use the n8n S3 credential values (access key, secret, region, optional session token) to sign the request.

#### Scenario: Credentials applied
- **WHEN** valid S3 credentials are configured in the node
- **THEN** the generated presigned upload data is signed using those credentials

### Requirement: Error handling
The system MUST surface signing errors in a clear, actionable way.

#### Scenario: Invalid credentials
- **WHEN** the credentials are invalid or rejected by the SDK
- **THEN** the system returns an error indicating signing failed and includes the SDK message
