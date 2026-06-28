export const filterReviewer = {
  name: 'filter',

  buildPrompt(allFindings) {
    const findingsList = allFindings.map((f, idx) =>
      `${idx + 1}. [${f.reviewer}] ${f.severity.toUpperCase()} - ${f.file}:${f.line || '?'}
   ${f.message}
   Suggestion: ${f.suggestion}`
    ).join('\n\n');

    return `You are reviewing feedback from automated code reviewers for a startup in active development.

The team wants to ship fast and iterate - they don't need perfect, hermetically sealed code. Your job is to filter out overly pedantic suggestions and keep only the issues that are genuinely worth addressing.

Here are the findings from the reviewers:

${findingsList}

Filter these findings and keep only those that meet ANY of these criteria:
- Actual bugs or logic errors that will cause runtime failures
- Security vulnerabilities that could be exploited
- Performance issues that will noticeably impact users
- Critical architectural problems that will make future changes significantly harder
- Missing error handling for likely failure scenarios

REJECT findings that are:
- Theoretical improvements with no clear immediate benefit
- Style or organization suggestions that don't affect functionality
- Over-engineering for edge cases that probably won't happen
- Premature optimizations
- Refactoring suggestions unless code is actively broken
- "Nice to have" architectural suggestions

Return a JSON array with ONLY the finding numbers (1-based index) that should be kept:
{
  "keep": [1, 5, 7]
}

If none of the findings meet the criteria, return {"keep": []}.`;
  },

  parseResponse(text) {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return { keep: [] };

      const result = JSON.parse(jsonMatch[0]);
      return result.keep || [];
    } catch (err) {
      console.error('Failed to parse filter response:', err.message);
      return { keep: [] };
    }
  }
};
