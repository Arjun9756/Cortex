/**
 * High-performance String Similarity utilities for Person Display Name matching.
 * Implements normalized Jaro-Winkler and Bigram Dice Coefficient metrics.
 */

/**
 * Calculates normalized string similarity (0.0 to 1.0) using Jaro-Winkler distance metric.
 * Ideal for human name comparison (e.g. "Rohan Verma" vs "rohanverma" or "Rohan V.").
 */
export function calculateJaroWinklerSimilarity(s1: string, s2: string): number {
    if (!s1 || !s2) return 0;
    const str1 = s1.trim().toLowerCase();
    const str2 = s2.trim().toLowerCase();

    if (str1 === str2) return 1.0;

    const len1 = str1.length;
    const len2 = str2.length;
    const matchDistance = Math.floor(Math.max(len1, len2) / 2) - 1;

    const s1Matches = new Array(len1).fill(false);
    const s2Matches = new Array(len2).fill(false);

    let matches = 0;
    let transpositions = 0;

    for (let i = 0; i < len1; i++) {
        const start = Math.max(0, i - matchDistance);
        const end = Math.min(i + matchDistance + 1, len2);

        for (let j = start; j < end; j++) {
            if (s2Matches[j]) continue;
            if (str1[i] !== str2[j]) continue;
            s1Matches[i] = true;
            s2Matches[j] = true;
            matches++;
            break;
        }
    }

    if (matches === 0) return 0;

    let k = 0;
    for (let i = 0; i < len1; i++) {
        if (!s1Matches[i]) continue;
        while (!s2Matches[k]) k++;
        if (str1[i] !== str2[k]) transpositions++;
        k++;
    }

    const jaro = (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;

    // Winkler prefix scaling boost (up to 4 initial characters)
    let prefix = 0;
    const maxPrefix = 4;
    for (let i = 0; i < Math.min(maxPrefix, len1, len2); i++) {
        if (str1[i] === str2[i]) prefix++;
        else break;
    }

    return jaro + prefix * 0.1 * (1 - jaro);
}

/**
 * Calculates Bigram Dice Coefficient similarity (0.0 to 1.0).
 */
export function calculateDiceSimilarity(s1: string, s2: string): number {
    if (!s1 || !s2) return 0;
    const str1 = s1.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const str2 = s2.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

    if (str1 === str2) return 1.0;
    if (str1.length < 2 || str2.length < 2) return 0;

    const getBigrams = (str: string): Map<string, number> => {
        const map = new Map<string, number>();
        for (let i = 0; i < str.length - 1; i++) {
            const bigram = str.substring(i, i + 2);
            map.set(bigram, (map.get(bigram) || 0) + 1);
        }
        return map;
    };

    const map1 = getBigrams(str1);
    const map2 = getBigrams(str2);

    let intersection = 0;
    for (const [bigram, count1] of map1.entries()) {
        const count2 = map2.get(bigram);
        if (count2) {
            intersection += Math.min(count1, count2);
        }
    }

    const totalBigrams = (str1.length - 1) + (str2.length - 1);
    return (2.0 * intersection) / totalBigrams;
}

/**
 * Combined high-precision name similarity score.
 */
export function calculateNameSimilarity(name1: string, name2: string): number {
    const jaroScore = calculateJaroWinklerSimilarity(name1, name2);
    const diceScore = calculateDiceSimilarity(name1, name2);
    return Math.max(jaroScore, diceScore);
}
