import { SSMClient, GetParametersCommand } from '@aws-sdk/client-ssm'

export interface EnvConfig {
  NEXT_PUBLIC_SUPABASE_URL: string
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string
  SUPABASE_SERVICE_ROLE_KEY: string
  JWT_SECRET: string
  ASAAS_API_KEY?: string
  ASAAS_SANDBOX?: string
}

let cachedEnvConfig: EnvConfig | null = null

export async function loadEnvFromAWS(): Promise<EnvConfig> {
  if (cachedEnvConfig) {
    return cachedEnvConfig
  }

  const isProduction = process.env.NODE_ENV === 'production'
  const awsRegion = process.env.AWS_REGION || 'us-east-1'
  const parameterPrefix = process.env.AWS_PARAMETER_PREFIX || '/nutriplan'

  if (!isProduction) {
    const localEnv: EnvConfig = {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      JWT_SECRET: process.env.JWT_SECRET || '',
      ASAAS_API_KEY: process.env.ASAAS_API_KEY,
      ASAAS_SANDBOX: process.env.ASAAS_SANDBOX,
    }
    cachedEnvConfig = localEnv
    return localEnv
  }

  try {
    const client = new SSMClient({ region: awsRegion })

    const parameterNames = [
      `${parameterPrefix}/NEXT_PUBLIC_SUPABASE_URL`,
      `${parameterPrefix}/NEXT_PUBLIC_SUPABASE_ANON_KEY`,
      `${parameterPrefix}/SUPABASE_SERVICE_ROLE_KEY`,
      `${parameterPrefix}/JWT_SECRET`,
      `${parameterPrefix}/ASAAS_API_KEY`,
      `${parameterPrefix}/ASAAS_SANDBOX`,
    ]

    const command = new GetParametersCommand({
      Names: parameterNames,
      WithDecryption: true,
    })

    const response = await client.send(command)

    if (!response.Parameters || response.Parameters.length === 0) {
      throw new Error('No parameters found in AWS Parameter Store')
    }

    const config: any = {}
    response.Parameters.forEach((param) => {
      const key = param.Name?.replace(`${parameterPrefix}/`, '')
      if (key && param.Value) {
        config[key] = param.Value
      }
    })

    cachedEnvConfig = config as EnvConfig
    return cachedEnvConfig
  } catch (error) {
    console.error('Error loading environment from AWS Parameter Store:', error)
    throw new Error(
      'Failed to load environment variables from AWS Parameter Store. Ensure AWS credentials are configured correctly.'
    )
  }
}

export function getEnvConfig(): EnvConfig {
  if (!cachedEnvConfig) {
    const localEnv: EnvConfig = {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      JWT_SECRET: process.env.JWT_SECRET || '',
      ASAAS_API_KEY: process.env.ASAAS_API_KEY,
      ASAAS_SANDBOX: process.env.ASAAS_SANDBOX,
    }
    return localEnv
  }
  return cachedEnvConfig
}
