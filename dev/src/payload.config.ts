import { buildConfig } from 'payload/config'
import path from 'path'
import Users from './collections/Users'
import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { webpackBundler } from '@payloadcms/bundler-webpack'
import { slateEditor } from '@payloadcms/richtext-slate'
import { Media } from './collections/Media'
import { abrVideos } from '../../dist'
import { Videos } from './collections/Videos'
import { OverrideSegments } from './collections/OverrideSegments'
import { cloudStorage } from '@payloadcms/plugin-cloud-storage'
import { gcsAdapter } from '@payloadcms/plugin-cloud-storage/gcs'

const sanitizePrivateKey = (key: any) => {
    if (typeof key !== 'string') return ''

    return key.replace(/\\n/g, '\n')
}

export const serviceAccount = {
    type: process.env.SERVICE_ACCOUNT_TYPE!,
    projectId: process.env.SERVICE_ACCOUNT_PROJECT_ID,
    private_key_id: process.env.SERVICE_ACCOUNT_PRIVATE_KEY_ID,
    private_key: sanitizePrivateKey(process.env.SERVICE_ACCOUNT_PRIVATE_KEY),
    client_email: process.env.SERVICE_ACCOUNT_CLIENT_EMAIL,
    client_id: process.env.SERVICE_ACCOUNT_CLIENT_ID,
    auth_uri: process.env.SERVICE_ACCOUNT_AUTH_URL,
    token_uri: process.env.SERVICE_ACCOUNT_TOKEN_URL,
    auth_provider_x509_cert_url: process.env.SERVICE_ACCOUNT_AUTH_PROVIDER_X509_CERT_URL,
    client_x509_cert_url: process.env.SERVICE_ACCOUNT_CLIENT_X509_CERT_URL,
    universe_domain: process.env.SERVICE_ACCOUNT_UNIVERSE_DOMAIN,
}

const adapter = gcsAdapter({
    options: {
        credentials: serviceAccount,
    },
    bucket: process.env.PAYLOAD_PUBLIC_FB_SB,
})

export default buildConfig({
    admin: {
        user: Users.slug,
        bundler: webpackBundler(),
        webpack: config => {
            const newConfig = {
                ...config,
                resolve: {
                    ...config.resolve,
                    alias: {
                        ...(config?.resolve?.alias || {}),
                        react: path.join(__dirname, '../node_modules/react'),
                        'react-dom': path.join(__dirname, '../node_modules/react-dom'),
                        payload: path.join(__dirname, '../node_modules/payload'),
                    },
                },
            }
            return newConfig
        },
    },
    cors: '*',
    serverURL: process.env.PAYLOAD_PUBLIC_SERVER_URL,
    editor: slateEditor({}),
    collections: [Users, Media, Videos],
    typescript: {
        outputFile: path.resolve(__dirname, 'payload-types.ts'),
    },
    graphQL: {
        schemaOutputFile: path.resolve(__dirname, 'generated-schema.graphql'),
    },
    plugins: [
        abrVideos({
            enabled: true,
            collections: {
                media: {
                    keepOriginal: true,
                    resolutions: [
                        { size: 480, bitrate: 1000 },
                        { size: 720, bitrate: 1500 },
                        { size: 1080, bitrate: 4000 },
                        { size: 1440, bitrate: 6000 },
                        { size: 2160, bitrate: 10000 },
                    ],
                    segmentDuration: 2,
                },
                videos: {
                    keepOriginal: true,
                    resolutions: [
                        { size: 144, bitrate: 150 },
                        { size: 240, bitrate: 250 },
                        { size: 300, bitrate: 500 },
                    ],
                    segmentDuration: 1,
                },
            },
        }),
        cloudStorage({
            collections: {
                media: {
                    adapter: adapter,
                    prefix: 'media',
                    disableLocalStorage: true,
                },
                segments: {
                    adapter: adapter,
                    prefix: 'segments',
                    disableLocalStorage: true,
                },
            },
        }),
    ],
    db: mongooseAdapter({
        url: process.env.DATABASE_URI!,
    }),
    upload: {
        limits: {
            fileSize: 50000000, // 500MB, written in bytes
        },
    },
})
