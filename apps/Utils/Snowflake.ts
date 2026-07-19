class Snowflake{
    // Twitter Snowflake Approach For Unique ID Generator
    private static readonly epochTime:bigint = BigInt(new Date("Jan 01 2020").getTime())

    // Bits Length
    private static readonly WORKER_BITS:bigint = 10n
    private static readonly SEQUENCE_BITS:bigint = 12n

    private static readonly TIMESTAMP_BITS:bigint = 41n
    private static readonly SIGNED_BIT:bigint = 1n

    private static readonly MAX_WORKER_ID:bigint = (1n << this.WORKER_BITS) - 1n // 0-1023
    private static readonly MAX_SEQUENCE:bigint = (1n << this.SEQUENCE_BITS) - 1n // 0-4095

    private static readonly WORKER_BITS_SHIFT:bigint = this.SEQUENCE_BITS
    private static readonly TIMESTAMP_BITS_SHIFT = (this.WORKER_BITS + this.SEQUENCE_BITS)

    private sequence = 0n
    private lastTimeStamp = -1n

    // [1Bit Signed , 41Bits Timestamp , 10Bit ServerID , 12Bit Sequence]

    constructor(private readonly workerID:bigint){
        if(workerID < 0 || workerID > Snowflake.MAX_WORKER_ID){
            throw new Error("Worker ID Must Be 0 to 1023 only")
        }
        this.workerID = workerID
    }

    private currentTimeStamp():bigint{
        return BigInt(Date.now())
    }

    private waitForNextMilliSeconds(lastTimeStamp:bigint){
        let current = this.currentTimeStamp()
        while(current <= lastTimeStamp){
            current = this.currentTimeStamp()
        }

        return current
    }

    public nextID():bigint{
        let timestamp = this.currentTimeStamp()
        if(timestamp < this.lastTimeStamp){
            throw new Error("Please Set Your Clock To Latest Time For India")
        }

        if(timestamp === this.lastTimeStamp){
            this.sequence++
            if(this.sequence > Snowflake.MAX_SEQUENCE){
                this.sequence = 0n
                timestamp = this.waitForNextMilliSeconds(timestamp)
            }
        }else{
            this.sequence = 0n
        }

        this.lastTimeStamp = timestamp
        const uniqueID = ((timestamp - Snowflake.epochTime) << Snowflake.TIMESTAMP_BITS | this.workerID << Snowflake.WORKER_BITS_SHIFT | this.sequence)

        return uniqueID
    }

    public decodeID(id:bigint){
        const timestamp = (id >> Snowflake.TIMESTAMP_BITS_SHIFT) + Snowflake.epochTime
        const workerID = (id >> Snowflake.WORKER_BITS_SHIFT) & Snowflake.MAX_WORKER_ID
        const sequence = id & Snowflake.MAX_SEQUENCE

        return {
            timestamp,
            workerID,
            sequence
        }
    }
}

export const snowflake = new Snowflake(23n)