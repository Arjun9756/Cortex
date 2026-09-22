export const ENTITY_TYPES = [
    'PERSON',
    'TECHNOLOGY',
    'REPOSITORY',
    'ISSUE',
    'PULL_REQUEST',
    'TEAM',
    'FILE',
    'ORGANIZATION'
] as const

export const RELATION_TYPES = [
    "USES",
    'HAS_PROBLEM',
    'FIXED_BY',
    'REPLACED_BY',
    'DEPENDS_ON',
    'WORKS_ON',
    'CREATED',
    'MENTIONED_IN',
    'ASSIGNED_TO',
    'PART_OF',
    'AUTHORED',
    'CONTRIBUTED_TO'
] as const