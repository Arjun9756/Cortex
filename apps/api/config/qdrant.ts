import {QdrantClient} from '@qdrant/js-client-rest'
import env from './env.js'

const client = new QdrantClient({
    apiKey:env.QDRANT_API_KEY!,
    url:env.QDRANT_CLUSTER_ENDPOINT!
})

export default client