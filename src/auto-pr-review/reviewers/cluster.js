/**
 * Cluster similar findings together to reduce noise.
 * Groups findings that have similar messages or address the same issue at multiple locations.
 */

/**
 * Calculate similarity between two strings (0-1)
 */
function stringSimilarity(str1, str2) {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1.0;

  // Split into words
  const words1 = new Set(s1.split(/\s+/));
  const words2 = new Set(s2.split(/\s+/));

  // Calculate Jaccard similarity
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

/**
 * Check if two findings are similar enough to cluster together
 */
function areSimilar(finding1, finding2, threshold = 0.6) {
  // Must be from same reviewer and same severity
  if (finding1.reviewer !== finding2.reviewer) return false;
  if (finding1.severity !== finding2.severity) return false;

  // Check message similarity
  const messageSim = stringSimilarity(finding1.message, finding2.message);

  // Also check suggestion similarity if both have suggestions
  let suggestionSim = 0;
  if (finding1.suggestion && finding2.suggestion) {
    suggestionSim = stringSimilarity(finding1.suggestion, finding2.suggestion);
  }

  // Consider similar if either message or suggestion is similar enough
  // Use lower threshold (0.6) to be more aggressive about clustering
  return messageSim >= threshold || suggestionSim >= threshold;
}

/**
 * Cluster findings that are similar
 * Returns an array where similar findings are merged into cluster objects
 */
export function clusterFindings(findings) {
  const clusters = [];
  const processed = new Set();

  for (let i = 0; i < findings.length; i++) {
    if (processed.has(i)) continue;

    const current = findings[i];
    const cluster = {
      reviewer: current.reviewer,
      severity: current.severity,
      message: current.message,
      suggestion: current.suggestion,
      locations: [
        {
          file: current.file,
          line: current.line
        }
      ]
    };

    processed.add(i);

    // Find all similar findings
    for (let j = i + 1; j < findings.length; j++) {
      if (processed.has(j)) continue;

      const candidate = findings[j];

      if (areSimilar(current, candidate)) {
        // Add this location to the cluster
        cluster.locations.push({
          file: candidate.file,
          line: candidate.line
        });
        processed.add(j);
      }
    }

    clusters.push(cluster);
  }

  return clusters;
}

/**
 * Deduplicate exact same file:line locations within a cluster
 */
export function deduplicateLocations(cluster) {
  const seen = new Set();
  const uniqueLocations = [];

  for (const loc of cluster.locations) {
    const key = `${loc.file}:${loc.line || '?'}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueLocations.push(loc);
    }
  }

  return {
    ...cluster,
    locations: uniqueLocations
  };
}
