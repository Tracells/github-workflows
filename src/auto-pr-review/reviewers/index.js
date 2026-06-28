import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { architectureReviewer } from './architecture.js';
import { reliabilityReviewer } from './reliability.js';
import { securityReviewer } from './security.js';
import { filterReviewer } from './filter.js';

const bedrock = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1'
});

export async function runReviewers(prContext, config) {
  const reviewers = [];

  if (config.reviewers.architecture) {
    reviewers.push(architectureReviewer);
  }
  if (config.reviewers.reliability) {
    reviewers.push(reliabilityReviewer);
  }
  if (config.reviewers.security) {
    reviewers.push(securityReviewer);
  }

  console.log(`Running ${reviewers.length} reviewers in parallel...`);

  // Run all reviewers in parallel
  const results = await Promise.all(
    reviewers.map(reviewer => runReviewer(reviewer, prContext, config))
  );

  // Flatten and deduplicate findings
  let allFindings = results.flat();
  allFindings = deduplicateFindings(allFindings);

  if (allFindings.length === 0) {
    return [];
  }

  // Filter findings through the filter agent to remove pedantic suggestions
  console.log(`Filtering ${allFindings.length} findings through filter agent...`);
  const filteredIndices = await runFilterReviewer(allFindings, config);

  const filteredFindings = filteredIndices.map(idx => allFindings[idx - 1]).filter(Boolean);
  console.log(`Filter kept ${filteredFindings.length} of ${allFindings.length} findings`);

  return filteredFindings;
}

async function runReviewer(reviewer, prContext, config) {
  console.log(`Starting ${reviewer.name} review...`);

  try {
    const prompt = reviewer.buildPrompt(prContext, config);

    const payload = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 4096,
      temperature: 0,
      messages: [{
        role: 'user',
        content: prompt
      }]
    };

    const command = new InvokeModelCommand({
      modelId: 'us.anthropic.claude-sonnet-4-5-20250929-v1:0',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(payload)
    });

    const response = await bedrock.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    const findings = reviewer.parseResponse(responseBody.content[0].text);
    console.log(`${reviewer.name} found ${findings.length} issues`);

    return findings;
  } catch (err) {
    console.error(`Error in ${reviewer.name}:`, err.message);
    return [];
  }
}

async function runFilterReviewer(allFindings, config) {
  console.log('Starting filter review...');

  try {
    const prompt = filterReviewer.buildPrompt(allFindings);

    const payload = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 4096,
      temperature: 0,
      messages: [{
        role: 'user',
        content: prompt
      }]
    };

    const command = new InvokeModelCommand({
      modelId: 'us.anthropic.claude-sonnet-4-5-20250929-v1:0',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(payload)
    });

    const response = await bedrock.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    return filterReviewer.parseResponse(responseBody.content[0].text);
  } catch (err) {
    console.error('Error in filter reviewer:', err.message);
    // If filter fails, return all findings (fail open)
    return allFindings.map((_, idx) => idx + 1);
  }
}

function deduplicateFindings(findings) {
  const seen = new Map();

  findings.forEach(finding => {
    // Create multiple keys to catch duplicates
    const locationKey = `${finding.file}:${finding.line}`;
    const messageKey = `${finding.file}:${finding.message}`;
    const suggestionKey = finding.suggestion ? `${finding.file}:${finding.suggestion}` : null;

    // Check if we've seen this finding at this exact location
    let isDuplicate = false;
    let duplicateKey = null;

    if (seen.has(locationKey)) {
      isDuplicate = true;
      duplicateKey = locationKey;
    } else if (seen.has(messageKey)) {
      isDuplicate = true;
      duplicateKey = messageKey;
    } else if (suggestionKey && seen.has(suggestionKey)) {
      isDuplicate = true;
      duplicateKey = suggestionKey;
    }

    if (!isDuplicate) {
      // Store with location key as primary
      seen.set(locationKey, finding);
    } else {
      // Keep the higher severity if duplicate
      const existing = seen.get(duplicateKey);
      const severityRank = { high: 3, medium: 2, low: 1 };

      if (severityRank[finding.severity] > severityRank[existing.severity]) {
        seen.set(duplicateKey, finding);
      }
    }
  });

  return Array.from(seen.values());
}
