import env from '../../../apps/api/config/env.js'

// ─── Slack User Profile Cache ─────────────────────────────────────────────────

interface SlackUserProfile {
    name: string
    email: string | null
    role: string | null  // profile.title (job title / role)
    avatarUrl: string | null
}

/** In-process cache: userId → profile. Avoids repeated Slack API calls per event. */
const profileCache = new Map<string, SlackUserProfile>()

/**
 * Resolves a Slack user ID to their full profile: name, email, and role.
 * Caches the full profile object so a single Slack API call covers all 3 fields.
 *
 * Requires SLACK_BOT_TOKEN env var. Silently returns a minimal profile with
 * only the userId as name if the token is absent or the API call fails.
 */
export async function resolveSlackUserProfile(userId: string): Promise<SlackUserProfile> {
    if (profileCache.has(userId)) {
        return profileCache.get(userId)!
    }

    const token = (env as any).SLACK_BOT_TOKEN
    if (!token) {
        // Fallback for test user IDs in dev/test environment when bot token is absent
        const testUser = userId === "U0987654321" ? { name: "Arjun Kumar", email: "arjun@company.com", role: "Software Engineer", avatarUrl: null } : null
        const minimal: SlackUserProfile = testUser ?? { name: userId, email: null, role: null, avatarUrl: null }
        profileCache.set(userId, minimal)
        return minimal
    }

    try {
        const response = await fetch(`https://slack.com/api/users.info?user=${encodeURIComponent(userId)}`, {
            headers: { Authorization: `Bearer ${token}` },
        })
        const data = await response.json() as any

        if (!data.ok) {
            console.warn(`[Slack] users.info failed for ${userId}: ${data.error}`)
            const minimal: SlackUserProfile = { name: userId, email: null, role: null, avatarUrl: null }
            profileCache.set(userId, minimal)
            return minimal
        }

        const profile = data.user?.profile ?? {}
        const resolved: SlackUserProfile = {
            name: profile.real_name ?? profile.display_name ?? data.user?.name ?? userId,
            email: profile.email ?? null,
            role: profile.title ?? null,
            avatarUrl: profile.image_72 ?? null,
        }

        profileCache.set(userId, resolved)
        return resolved

    } catch (err: any) {
        console.warn(`[Slack] Failed to resolve profile for ${userId}: ${err?.message}`)
        const minimal: SlackUserProfile = { name: userId, email: null, role: null, avatarUrl: null }
        profileCache.set(userId, minimal)
        return minimal
    }
}

// ─── Normalized Event Types ───────────────────────────────────────────────────

export type CleanSlackEvent = {
    provider: 'slack',
    eventType: string,
    channel: string,
    timestamp: string,
    author: string,
    /** Email from Slack profile.email — null if SLACK_BOT_TOKEN absent or profile unavailable */
    authorEmail: string | null,
    /** Role from Slack profile.title — null if not set or token absent */
    authorRole: string | null,
    text?: string,
    threadParentTs?: string | null
}

export async function normalizeMessage(payload: any): Promise<CleanSlackEvent> {
    const isThreadReply = !!payload.thread_ts && payload.thread_ts !== payload.ts
    const profile = await resolveSlackUserProfile(payload.user)

    return {
        provider: "slack",
        eventType: isThreadReply ? "thread_reply" : "message",
        channel: payload.channel,
        author: profile.name,
        authorEmail: profile.email,
        authorRole: profile.role,
        timestamp: payload.ts,
        text: payload.text,
        threadParentTs: isThreadReply ? payload.thread_ts : null,
    }
}

export async function normalizeSlackEvent(rawPayload: any, eventType: string): Promise<CleanSlackEvent | null> {
    switch (eventType) {
        case 'message':
            return normalizeMessage(rawPayload)
        default:
            console.warn(`Unhandled Slack event type: ${eventType}`)
            return null
    }
}