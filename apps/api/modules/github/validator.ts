import crypto from 'crypto'
import env from '../../config/env.js'
/**
 * Verify Signature From Webhook
 * Checks For Timing is Safe or Not
 * @param payload 
 * @param signature
 * @returns {boolean}
 */

export function validateGithubSignature(signature:string | undefined , rawBody:Buffer | undefined):boolean{
    const secret = env.GITHUB_SECRET
    if(!secret){
        console.warn(`Github Secret Key is Not Provided`)
        return false
    }

    if(!signature){
        console.warn(`No Github Signature Provide`)
        return false
    }

    if (!rawBody) {
        console.warn(`No Raw Body Available For Signature Verification`)
        return false
    }

    const hmac = crypto.createHmac('sha256' , secret)
    const digest = 'sha256=' + hmac.update(rawBody).digest('hex')

    try{
        return crypto.timingSafeEqual(Buffer.from(digest) , Buffer.from(signature))
    }catch(error:any){
        return false
    }
}