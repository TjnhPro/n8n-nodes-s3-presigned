import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class S3PresignedApi implements ICredentialType {
	name = 's3PresignedApi';
	displayName = 'S3 Presigned API';
	icon = { light: 'file:../icons/S3Presigned.svg', dark: 'file:../icons/S3Presigned.svg' } as const;
	documentationUrl = 'https://docs.aws.amazon.com/general/latest/gr/aws-access-keys-best-practices.html';
	properties: INodeProperties[] = [
		{
			displayName: 'Access Key ID',
			name: 'accessKeyId',
			type: 'string',
			default: '',
			required: true,
		},
		{
			displayName: 'Secret Access Key',
			name: 'secretAccessKey',
			type: 'string',
			default: '',
			required: true,
			typeOptions: {
				password: true,
			},
		},
		{
			displayName: 'Region',
			name: 'region',
			type: 'string',
			default: 'us-east-1',
			required: true,
		},
		{
			displayName: 'Session Token',
			name: 'sessionToken',
			type: 'string',
			default: '',
			required: false,
			typeOptions: {
				password: true,
			},
		},
	];
}
