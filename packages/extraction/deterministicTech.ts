/**
 * Deterministic Technology Detection Engine
 * 
 * Provides 100% deterministic, zero-AI-overhead technology detection from
 * repository file manifests and extensions. Completely avoids LLM latency,
 * token costs, and hallucinations.
 */

interface TechRule {
    name: string;
    manifestPatterns?: RegExp[];
    extensionPatterns?: RegExp[];
    confidence: number;
}

const TECH_RULES: TechRule[] = [
    // Runtimes & Core Languages
    {
        name: 'TypeScript',
        manifestPatterns: [/tsconfig\.json$/i],
        extensionPatterns: [/\.tsx?$/i],
        confidence: 1.0
    },
    {
        name: 'JavaScript',
        manifestPatterns: [/package\.json$/i],
        extensionPatterns: [/\.jsx?$/i, /\.mjs$/i, /\.cjs$/i],
        confidence: 1.0
    },
    {
        name: 'Python',
        manifestPatterns: [/requirements\.txt$/i, /pyproject\.toml$/i, /Pipfile$/i, /setup\.py$/i],
        extensionPatterns: [/\.py$/i],
        confidence: 1.0
    },
    {
        name: 'Go',
        manifestPatterns: [/go\.mod$/i, /go\.sum$/i],
        extensionPatterns: [/\.go$/i],
        confidence: 1.0
    },
    {
        name: 'Rust',
        manifestPatterns: [/Cargo\.toml$/i, /Cargo\.lock$/i],
        extensionPatterns: [/\.rs$/i],
        confidence: 1.0
    },
    {
        name: 'Java',
        manifestPatterns: [/pom\.xml$/i, /build\.gradle(\.kts)?$/i],
        extensionPatterns: [/\.java$/i, /\.kt$/i],
        confidence: 1.0
    },
    {
        name: 'Ruby',
        manifestPatterns: [/Gemfile$/i],
        extensionPatterns: [/\.rb$/i],
        confidence: 1.0
    },
    {
        name: 'PHP',
        manifestPatterns: [/composer\.json$/i],
        extensionPatterns: [/\.php$/i],
        confidence: 1.0
    },
    {
        name: 'C#',
        manifestPatterns: [/\.csproj$/i, /\.sln$/i],
        extensionPatterns: [/\.cs$/i],
        confidence: 1.0
    },
    {
        name: 'C++',
        extensionPatterns: [/\.(cpp|cxx|cc|hpp|h)$/i],
        confidence: 1.0
    },
    // Infrastructure & Containers
    {
        name: 'Docker',
        manifestPatterns: [/Dockerfile/i, /docker-compose\.ya?ml$/i, /\.dockerignore$/i],
        confidence: 1.0
    },
    {
        name: 'Terraform',
        extensionPatterns: [/\.tf$/i, /\.tfvars$/i],
        confidence: 1.0
    },
    {
        name: 'Kubernetes',
        manifestPatterns: [/k8s\/.*\.ya?ml$/i, /helm\//i],
        confidence: 0.9
    },
    {
        name: 'HTML',
        extensionPatterns: [/\.html?$/i],
        confidence: 1.0
    },
    {
        name: 'CSS',
        extensionPatterns: [/\.css$/i, /\.scss$/i, /\.sass$/i, /\.less$/i],
        confidence: 1.0
    },
    {
        name: 'TailwindCSS',
        manifestPatterns: [/tailwind\.config\.(js|cjs|mjs|ts)$/i],
        confidence: 1.0
    },
    {
        name: 'React',
        extensionPatterns: [/\.jsx$/i, /\.tsx$/i],
        confidence: 1.0
    },
    {
        name: 'Next.js',
        manifestPatterns: [/next\.config\.(js|cjs|mjs|ts)$/i],
        confidence: 1.0
    },
    {
        name: 'Vue',
        extensionPatterns: [/\.vue$/i],
        confidence: 1.0
    },
    {
        name: 'Svelte',
        extensionPatterns: [/\.svelte$/i],
        confidence: 1.0
    },
    {
        name: 'Markdown',
        extensionPatterns: [/\.mdx?$/i],
        confidence: 1.0
    },
    {
        name: 'SQL',
        extensionPatterns: [/\.sql$/i],
        confidence: 1.0
    },
    {
        name: 'Swift',
        manifestPatterns: [/Package\.swift$/i],
        extensionPatterns: [/\.swift$/i],
        confidence: 1.0
    },
    {
        name: 'Kotlin',
        extensionPatterns: [/\.kts?$/i],
        confidence: 1.0
    },
    {
        name: 'Shell',
        extensionPatterns: [/\.(sh|bash|zsh)$/i],
        confidence: 1.0
    },
    {
        name: 'GraphQL',
        extensionPatterns: [/\.(graphql|gql)$/i],
        confidence: 1.0
    },
    {
        name: 'Vite',
        manifestPatterns: [/vite\.config\.(js|ts|mjs|cjs)$/i],
        confidence: 1.0
    },
    {
        name: 'GitHub Actions',
        manifestPatterns: [/\.github\/workflows\/.*\.ya?ml$/i],
        confidence: 1.0
    }
];

/**
 * Extracts a unique, verified list of technologies based strictly on
 * file names and paths present in the commit or pull request.
 */
/**
 * Normalizes an external language or technology name (such as GitHub's
 * repository.language or topic tags) to Cortex's standard technology taxonomy.
 */
export function normalizeTechnologyName(name: string): string | null {
    if (!name || typeof name !== 'string') return null;
    const clean = name.trim().toLowerCase().replace(/[-_]/g, '');
    for (const rule of TECH_RULES) {
        const ruleClean = rule.name.toLowerCase().replace(/[-_]/g, '');
        if (ruleClean === clean) {
            return rule.name;
        }
    }
    const directMap: Record<string, string> = {
        'typescript': 'TypeScript',
        'javascript': 'JavaScript',
        'python': 'Python',
        'html': 'HTML',
        'css': 'CSS',
        'go': 'Go',
        'golang': 'Go',
        'rust': 'Rust',
        'java': 'Java',
        'kotlin': 'Kotlin',
        'swift': 'Swift',
        'c#': 'C#',
        'csharp': 'C#',
        'c++': 'C++',
        'cpp': 'C++',
        'c': 'C',
        'php': 'PHP',
        'ruby': 'Ruby',
        'shell': 'Shell',
        'bash': 'Shell',
        'dockerfile': 'Docker',
        'docker': 'Docker',
        'vue': 'Vue',
        'react': 'React',
        'nextjs': 'Next.js',
        'tailwindcss': 'TailwindCSS',
        'tailwind': 'TailwindCSS',
        'svelte': 'Svelte',
        'markdown': 'Markdown',
        'sql': 'SQL',
        'postgresql': 'Postgres',
        'postgres': 'Postgres',
        'mysql': 'MySQL',
        'redis': 'Redis',
        'kafka': 'Kafka',
        'graphql': 'GraphQL',
    };
    return directMap[clean] || null;
}

/**
 * Extracts a unique, verified list of technologies based strictly on
 * file names and paths present in the commit or pull request, optionally
 * supplemented with authoritative repository metadata (language, topics).
 */
export function detectTechnologiesFromFiles(
    fileList: string[],
    repoLanguage?: string | null,
    repoTopics?: string[] | null
): string[] {
    const detected = new Set<string>();

    if (Array.isArray(fileList)) {
        for (const file of fileList) {
            if (!file || typeof file !== 'string') continue;
            const normalized = file.trim().replace(/\\/g, '/');

            for (const rule of TECH_RULES) {
                // Check manifest patterns
                if (rule.manifestPatterns && rule.manifestPatterns.some(p => p.test(normalized))) {
                    detected.add(rule.name);
                }
                // Check extension patterns
                if (rule.extensionPatterns && rule.extensionPatterns.some(p => p.test(normalized))) {
                    detected.add(rule.name);
                }
            }
        }
    }

    // Include verified repository language from GitHub metadata if present
    if (repoLanguage) {
        const normLang = normalizeTechnologyName(repoLanguage);
        if (normLang) detected.add(normLang);
    }

    // Include verified repository topics from GitHub metadata if present
    if (Array.isArray(repoTopics)) {
        for (const topic of repoTopics) {
            const normTopic = normalizeTechnologyName(topic);
            if (normTopic) detected.add(normTopic);
        }
    }

    return Array.from(detected);
}
