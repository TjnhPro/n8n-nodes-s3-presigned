import crypto from 'crypto';
import https from 'https';

import {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';
import { XMLParser } from 'fast-xml-parser';

type MetadataEntry = {
	key?: string;
	value?: string;
};

type AwsCredentials = {
	accessKeyId: string;
	secretAccessKey: string;
	region: string;
	sessionToken?: string;
};

const SERVICE = 's3';
const ALGORITHM = 'AWS4-HMAC-SHA256';
const MAX_EXPIRES = 604800;

const encodeRfc3986 = (value: string): string =>
	encodeURIComponent(value).replace(/[!'()*]/g, (char) =>
		`%${char.charCodeAt(0).toString(16).toUpperCase()}`,
	);

const encodeS3Key = (key: string): string => key.split('/').map(encodeRfc3986).join('/');

const hashSha256 = (value: string): string =>
	crypto.createHash('sha256').update(value, 'utf8').digest('hex');

const hmacSha256 = (key: crypto.BinaryLike, value: string): Buffer =>
	crypto.createHmac('sha256', key).update(value, 'utf8').digest();

const getSignatureKey = (secret: string, dateStamp: string, region: string): Buffer => {
	const kDate = hmacSha256(`AWS4${secret}`, dateStamp);
	const kRegion = hmacSha256(kDate, region);
	const kService = hmacSha256(kRegion, SERVICE);
	return hmacSha256(kService, 'aws4_request');
};

const toAmzDate = (date: Date): { amzDate: string; dateStamp: string } => {
	const pad = (value: number): string => value.toString().padStart(2, '0');
	const year = date.getUTCFullYear();
	const month = pad(date.getUTCMonth() + 1);
	const day = pad(date.getUTCDate());
	const hours = pad(date.getUTCHours());
	const minutes = pad(date.getUTCMinutes());
	const seconds = pad(date.getUTCSeconds());
	const dateStamp = `${year}${month}${day}`;
	const amzDate = `${dateStamp}T${hours}${minutes}${seconds}Z`;
	return { amzDate, dateStamp };
};

const buildHost = (bucket: string, region: string): string => {
	if (region === 'us-east-1') {
		return `${bucket}.s3.amazonaws.com`;
	}
	return `${bucket}.s3.${region}.amazonaws.com`;
};

const buildS3Endpoint = (
	bucket: string,
	region: string,
): { host: string; pathPrefix: string } => {
	if (bucket.includes('.')) {
		const host = region === 'us-east-1' ? 's3.amazonaws.com' : `s3.${region}.amazonaws.com`;
		return { host, pathPrefix: `/${bucket}` };
	}
	return { host: buildHost(bucket, region), pathPrefix: '' };
};

const buildCanonicalQuery = (params: Record<string, string>): string => {
	return Object.keys(params)
		.sort()
		.map((key) => `${encodeRfc3986(key)}=${encodeRfc3986(params[key])}`)
		.join('&');
};

const buildCanonicalHeaders = (headers: Record<string, string>): {
	canonicalHeaders: string;
	signedHeaders: string;
} => {
	const entries = Object.entries(headers)
		.map(([key, value]) => [key.toLowerCase(), value.trim().replace(/\s+/g, ' ')] as const)
		.sort(([a], [b]) => a.localeCompare(b));

	const canonicalHeaders = entries.map(([key, value]) => `${key}:${value}\n`).join('');
	const signedHeaders = entries.map(([key]) => key).join(';');

	return { canonicalHeaders, signedHeaders };
};

const buildMetadata = (metadataValues?: MetadataEntry[]): Record<string, string> => {
	const metadata: Record<string, string> = {};
	if (!Array.isArray(metadataValues)) {
		return metadata;
	}

	for (const entry of metadataValues) {
		if (!entry?.key) continue;
		metadata[entry.key] = entry.value ?? '';
	}
	return metadata;
};

const buildPresignedPutUrl = (params: {
	bucket: string;
	key: string;
	expiresIn: number;
	contentType?: string;
	contentDisposition?: string;
	acl?: string;
	metadata: Record<string, string>;
	credentials: AwsCredentials;
	requestDate: Date;
}): { url: string; headers: Record<string, string>; expiresAt: string } => {
	const {
		bucket,
		key,
		expiresIn,
		contentType,
		contentDisposition,
		acl,
		metadata,
		credentials,
		requestDate,
	} = params;
	const { amzDate, dateStamp } = toAmzDate(requestDate);
	const credentialScope = `${dateStamp}/${credentials.region}/${SERVICE}/aws4_request`;
	const credential = `${credentials.accessKeyId}/${credentialScope}`;
	const host = buildHost(bucket, credentials.region);

	const headers: Record<string, string> = { host };
	if (contentType) headers['content-type'] = contentType;
	if (contentDisposition) headers['content-disposition'] = contentDisposition;
	if (acl) headers['x-amz-acl'] = acl;
	for (const [metaKey, metaValue] of Object.entries(metadata)) {
		headers[`x-amz-meta-${metaKey}`] = metaValue;
	}

	const { canonicalHeaders, signedHeaders } = buildCanonicalHeaders(headers);

	const queryParams: Record<string, string> = {
		'X-Amz-Algorithm': ALGORITHM,
		'X-Amz-Credential': credential,
		'X-Amz-Date': amzDate,
		'X-Amz-Expires': expiresIn.toString(),
		'X-Amz-SignedHeaders': signedHeaders,
	};

	if (credentials.sessionToken) {
		queryParams['X-Amz-Security-Token'] = credentials.sessionToken;
	}

	const canonicalUri = `/${encodeS3Key(key)}`;
	const canonicalQueryString = buildCanonicalQuery(queryParams);
	const canonicalRequest = [
		'PUT',
		canonicalUri,
		canonicalQueryString,
		canonicalHeaders,
		signedHeaders,
		'UNSIGNED-PAYLOAD',
	].join('\n');

	const stringToSign = [
		ALGORITHM,
		amzDate,
		credentialScope,
		hashSha256(canonicalRequest),
	].join('\n');

	const signingKey = getSignatureKey(
		credentials.secretAccessKey,
		dateStamp,
		credentials.region,
	);
	const signature = crypto
		.createHmac('sha256', signingKey)
		.update(stringToSign, 'utf8')
		.digest('hex');

	queryParams['X-Amz-Signature'] = signature;
	const finalQuery = buildCanonicalQuery(queryParams);
	const url = `https://${host}${canonicalUri}?${finalQuery}`;
	const expiresAt = new Date(requestDate.getTime() + expiresIn * 1000).toISOString();

	const responseHeaders: Record<string, string> = {};
	if (contentType) responseHeaders['Content-Type'] = contentType;
	if (contentDisposition) responseHeaders['Content-Disposition'] = contentDisposition;
	if (acl) responseHeaders['x-amz-acl'] = acl;
	for (const [metaKey, metaValue] of Object.entries(metadata)) {
		responseHeaders[`x-amz-meta-${metaKey}`] = metaValue;
	}

	return { url, headers: responseHeaders, expiresAt };
};

const buildAuthorizationHeader = (params: {
	method: string;
	path: string;
	queryParams: Record<string, string>;
	headers: Record<string, string>;
	credentials: AwsCredentials;
	requestDate: Date;
}): { authorization: string; signedHeaders: string; amzDate: string } => {
	const { method, path, queryParams, headers, credentials, requestDate } = params;
	const { amzDate, dateStamp } = toAmzDate(requestDate);
	const credentialScope = `${dateStamp}/${credentials.region}/${SERVICE}/aws4_request`;
	const { canonicalHeaders, signedHeaders } = buildCanonicalHeaders(headers);
	const canonicalQueryString = buildCanonicalQuery(queryParams);
	const canonicalRequest = [
		method,
		path,
		canonicalQueryString,
		canonicalHeaders,
		signedHeaders,
		'UNSIGNED-PAYLOAD',
	].join('\n');

	const stringToSign = [
		ALGORITHM,
		amzDate,
		credentialScope,
		hashSha256(canonicalRequest),
	].join('\n');

	const signingKey = getSignatureKey(
		credentials.secretAccessKey,
		dateStamp,
		credentials.region,
	);
	const signature = crypto
		.createHmac('sha256', signingKey)
		.update(stringToSign, 'utf8')
		.digest('hex');

	const authorization = `${ALGORITHM} Credential=${credentials.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
	return { authorization, signedHeaders, amzDate };
};

const requestXml = async (
	url: string,
	headers: Record<string, string>,
): Promise<string> =>
	new Promise((resolve, reject) => {
		const request = https.request(url, { method: 'GET', headers }, (response) => {
			const chunks: Buffer[] = [];
			response.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
			response.on('end', () => {
				const body = Buffer.concat(chunks).toString('utf8');
				if (response.statusCode && response.statusCode >= 200 && response.statusCode < 300) {
					resolve(body);
					return;
				}
				reject(new Error(`S3 request failed (${response.statusCode}): ${body}`));
			});
		});
		request.on('error', (error) => reject(error));
		request.end();
	});

const normalizeArray = <T>(value?: T | T[]): T[] => {
	if (!value) return [];
	return Array.isArray(value) ? value : [value];
};

const normalizePrefix = (prefix?: string): string => {
	if (!prefix) return '';
	return prefix.endsWith('/') ? prefix : `${prefix}/`;
};

const toFolderName = (prefix: string): string => {
	const trimmed = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix;
	const parts = trimmed.split('/').filter(Boolean);
	return parts[parts.length - 1] ?? trimmed;
};

const toFileName = (key: string): string => {
	const parts = key.split('/').filter(Boolean);
	return parts[parts.length - 1] ?? key;
};

export class S3PresignedUpload implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'S3 Presigned Upload',
		name: 's3PresignedUpload',
		icon: 'file:../../icons/S3Presigned.svg',
		group: ['transform'],
		version: 1,
		description: 'Generate presigned S3 upload data or list S3 folders (ListObjectsV2)',
		usableAsTool: true,
		defaults: {
			name: 'S3 Presigned Upload',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [{ name: 's3PresignedApi', required: true, testedBy: 's3PresignedUpload' }],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				options: [
					{ name: 'Presigned Upload (PUT)', value: 'presignedUpload' },
					{ name: 'List Tree (ListObjectsV2)', value: 'listTree' },
				],
				default: 'presignedUpload',
				noDataExpression: true,
			},
			{
				displayName: 'Bucket',
				name: 'bucket',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['presignedUpload', 'listTree'],
					},
				},
			},
			{
				displayName: 'Object Key',
				name: 'key',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['presignedUpload'],
					},
				},
			},
			{
				displayName: 'Expires In (Seconds)',
				name: 'expiresIn',
				type: 'number',
				default: 900,
				required: true,
				typeOptions: {
					minValue: 1,
					maxValue: MAX_EXPIRES,
				},
				displayOptions: {
					show: {
						operation: ['presignedUpload'],
					},
				},
			},
		{
			displayName: 'Content Type',
			name: 'contentType',
			type: 'string',
			default: '',
			displayOptions: {
				show: {
					operation: ['presignedUpload'],
				},
			},
		},
		{
			displayName: 'Content Disposition',
			name: 'contentDisposition',
			type: 'options',
			options: [
				{ name: 'Attachment', value: 'attachment' },
				{ name: 'None', value: '' },
			],
			default: '',
			displayOptions: {
				show: {
					operation: ['presignedUpload'],
				},
			},
		},
		{
			displayName: 'ACL',
			name: 'acl',
			type: 'options',
				options: [
					{ name: 'Authenticated Read', value: 'authenticated-read' },
					{ name: 'Bucket Owner Full Control', value: 'bucket-owner-full-control' },
					{ name: 'Bucket Owner Read', value: 'bucket-owner-read' },
					{ name: 'None', value: '' },
					{ name: 'Private', value: 'private' },
					{ name: 'Public Read', value: 'public-read' },
					{ name: 'Public Read Write', value: 'public-read-write' },
				],
				default: '',
				displayOptions: {
					show: {
						operation: ['presignedUpload'],
					},
				},
			},
			{
				displayName: 'Metadata',
				name: 'metadata',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				options: [
					{
						name: 'metadataValues',
						displayName: 'Metadata',
						values: [
							{
								displayName: 'Key',
								name: 'key',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
							},
						],
					},
				],
				displayOptions: {
					show: {
						operation: ['presignedUpload'],
					},
				},
			},
			{
				displayName: 'Prefix',
				name: 'prefix',
				type: 'string',
				default: '',
				description: 'Folder hiện tại. Để trống để duyệt root',
				displayOptions: {
					show: {
						operation: ['listTree'],
					},
				},
			},
			{
				displayName: 'Delimiter',
				name: 'delimiter',
				type: 'string',
				default: '',
				required: true,
				description: 'Bắt buộc dùng "/" để duyệt theo folder',
				displayOptions: {
					show: {
						operation: ['listTree'],
					},
				},
			},
			{
				displayName: 'Max Keys',
				name: 'maxKeys',
				type: 'number',
				default: 100,
				typeOptions: {
					minValue: 1,
					maxValue: 1000,
				},
				displayOptions: {
					show: {
						operation: ['listTree'],
					},
				},
			},
			{
				displayName: 'Continuation Token',
				name: 'continuationToken',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: ['listTree'],
					},
				},
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const credentials = (await this.getCredentials('s3PresignedApi')) as AwsCredentials;
		if (!credentials?.accessKeyId || !credentials?.secretAccessKey || !credentials?.region) {
			throw new NodeOperationError(
				this.getNode(),
				'AWS credentials are missing access key, secret key, or region',
			);
		}

		for (let i = 0; i < items.length; i++) {
			const operation = this.getNodeParameter('operation', i) as string;
			const bucket = this.getNodeParameter('bucket', i) as string;

			if (!bucket) {
				throw new NodeOperationError(this.getNode(), 'Bucket is required');
			}

			if (operation === 'presignedUpload') {
				const key = this.getNodeParameter('key', i) as string;
				const expiresIn = this.getNodeParameter('expiresIn', i) as number;
				const contentType = this.getNodeParameter('contentType', i, '') as string;
				const contentDisposition = this.getNodeParameter('contentDisposition', i, '') as string;
				const acl = this.getNodeParameter('acl', i, '') as string;
				const metadataCollection = this.getNodeParameter('metadata', i, {}) as IDataObject;
				const metadataValues = metadataCollection.metadataValues as MetadataEntry[] | undefined;

				if (!bucket || !key || !expiresIn) {
					throw new NodeOperationError(this.getNode(), 'Bucket, key, and expiration are required');
				}

				if (expiresIn < 1 || expiresIn > MAX_EXPIRES) {
					throw new NodeOperationError(
						this.getNode(),
						`Expiration must be between 1 and ${MAX_EXPIRES} seconds`,
					);
				}

				const metadata = buildMetadata(metadataValues);
				const requestDate = new Date();

				try {
					const presignedPut = buildPresignedPutUrl({
						bucket,
						key,
						expiresIn,
						contentType: contentType || undefined,
						contentDisposition: contentDisposition || undefined,
						acl: acl || undefined,
						metadata,
						credentials,
						requestDate,
					});

					returnData.push({
						json: {
							url: presignedPut.url,
							method: 'PUT',
							headers: presignedPut.headers,
							expiresAt: presignedPut.expiresAt,
						},
					});
				} catch (error) {
					const message = error instanceof Error ? error.message : 'Unknown error';
					throw new NodeOperationError(
						this.getNode(),
						`Failed to generate presigned upload data: ${message}`,
					);
				}
			}

			if (operation === 'listTree') {
				const prefixInput = this.getNodeParameter('prefix', i, '') as string;
				const delimiter = this.getNodeParameter('delimiter', i, '') as string;
				const maxKeys = this.getNodeParameter('maxKeys', i, 100) as number;
				const continuationToken = this.getNodeParameter('continuationToken', i, '') as string;

				if (!delimiter) {
					throw new NodeOperationError(this.getNode(), 'Delimiter is required for list tree');
				}
				if (maxKeys < 1 || maxKeys > 1000) {
					throw new NodeOperationError(this.getNode(), 'MaxKeys must be between 1 and 1000');
				}

				const prefix = normalizePrefix(prefixInput);
				const requestDate = new Date();
				const endpoint = buildS3Endpoint(bucket, credentials.region);
				const queryParams: Record<string, string> = {
					'list-type': '2',
					'max-keys': maxKeys.toString(),
					delimiter,
				};
				if (prefix) queryParams.prefix = prefix;
				if (continuationToken) queryParams['continuation-token'] = continuationToken;
				const { amzDate } = toAmzDate(requestDate);
				const headers: Record<string, string> = {
					host: endpoint.host,
					'x-amz-date': amzDate,
					'x-amz-content-sha256': 'UNSIGNED-PAYLOAD',
				};
				if (credentials.sessionToken) {
					headers['x-amz-security-token'] = credentials.sessionToken;
				}

				const requestPath = `${endpoint.pathPrefix || ''}/`;
				const { authorization } = buildAuthorizationHeader({
					method: 'GET',
					path: requestPath,
					queryParams,
					headers,
					credentials,
					requestDate,
				});

				headers.Authorization = authorization;

				try {
					const url = `https://${endpoint.host}${requestPath}?${buildCanonicalQuery(queryParams)}`;
					const xmlResponse = await requestXml(url, headers);
					const parser = new XMLParser({
						ignoreAttributes: false,
						attributeNamePrefix: '',
						parseTagValue: true,
						parseAttributeValue: true,
						trimValues: true,
					});
					const parsed = parser.parse(xmlResponse);
					const result = parsed?.ListBucketResult ?? {};
					const isTruncated = result.IsTruncated === true || result.IsTruncated === 'true';
					const nextContinuationToken = result.NextContinuationToken ?? '';
					const commonPrefixes = normalizeArray(result.CommonPrefixes).map(
						(entry: { Prefix?: string }) => ({
							Prefix: entry.Prefix ?? '',
						}),
					);
					const contents = normalizeArray(result.Contents)
						.map((entry: { Key?: string; Size?: string | number; LastModified?: string }) => ({
							Key: entry.Key ?? '',
							Size: entry.Size ? Number(entry.Size) : 0,
							LastModified: entry.LastModified ?? '',
						}))
						.filter((entry) => entry.Key && entry.Key !== prefix);

					const folderNodes = commonPrefixes.map((entry) => ({
						type: 'folder',
						key: entry.Prefix,
						path: entry.Prefix,
						name: toFolderName(entry.Prefix),
					}));
					const fileNodes = contents.map((entry) => ({
						type: 'file',
						key: entry.Key,
						path: entry.Key,
						name: toFileName(entry.Key),
						size: entry.Size,
						lastModified: entry.LastModified,
					}));

					returnData.push({
						json: {
							items: [...folderNodes, ...fileNodes],
							pagination: {
								hasMore: isTruncated,
								nextToken: nextContinuationToken,
							},
						},
					});
				} catch (error) {
					const message = error instanceof Error ? error.message : 'Unknown error';
					throw new NodeOperationError(
						this.getNode(),
						`Failed to list S3 objects: ${message}`,
					);
				}
			}
		}

		return [returnData];
	}
}
