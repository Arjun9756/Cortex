import redis from "../../apps/api/config/redis.js";
import {Queue} from 'bullmq'

export const cortexQueue = new Queue('processing-queue' , {connection:redis})