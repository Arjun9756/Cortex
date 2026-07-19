import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({
    path: path.resolve(__dirname, '..', '..', '..' ,'.env')
})

const envObject = {
    PORT:process.env.PORT,
    NODE_ENV:process.env.NODE_ENV,

    POSTGRES_HOST:process.env.POSTGRES_HOST,
    POSTGRES_PORT:process.env.POSTGRES_PORT,
    POSTGRES_USER:process.env.POSTGRES_USER,
    POSTGRES_PASSWORD:process.env.POSTGRES_PASSWORD,
    POSTGRES_DATABASE:process.env.POSTGRES_DATABASE,

    NEO4J_URI:process.env.NEO4J_URI,
    NEO4J_USERNAME:process.env.NEO4J_USERNAME,
    NEO4J_PASSWORD:process.env.NEO4J_PASSWORD,
    NEO4J_DATABASE:process.env.NEO4J_DATABASE,
    AURA_INSTANCEID:process.env.AURA_INSTANCEID,
    AURA_INSTANCENAME:process.env.AURA_INSTANCENAME || "Free instance",

    REDIS_HOST:process.env.REDIS_HOST,
    REDIS_PASSWORD:process.env.REDIS_PASSWORD,
    REDIS_USERNAME:process.env.REDIS_USERNAME,
    REDIS_PORT:process.env.REDIS_PORT,

    JWT_SECRET:process.env.JWT_SECRET,
    SERVER_SECRET:process.env.SERVER_SECRET,
    
    GROQ_API_KEY:process.env.GROQ_API_KEY,
    GEMINI_API_KEY:process.env.GEMINI_API_KEY,

    QUEUE_WORKERS_CONCURRENCY:parseInt(process.env.QUEUE_WORKERS_CONCURRENCY || "1"),
    
    KAFKA_HOST:process.env.KAFKA_HOST,
    KAFKA_PORT:process.env.KAFKA_PORT,
    KAFKA_PASSWORD:process.env.KAFKA_PASSWORD,
    KAFKA_USER:process.env.KAFKA_USER || "avnadmin",

    PINECONE_API_KEY:process.env.PINECONE_API_KEY,
    RATE_LIMIT:parseInt(process.env.RATE_LIMIT || "150"),

    GITHUB_SECRET:process.env.GITHUB_SECRET
}

console.log(envObject)
export default Object.freeze(envObject)