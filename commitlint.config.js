/**
 * Commitlint Configuration - World-Class Commit Standards
 *
 * Enforces conventional commits: type(scope): message
 * Examples:
 *   ✅ feat(auth): add OAuth2 support
 *   ✅ fix(api): resolve null pointer in user handler
 *   ✅ docs: update README with setup instructions
 *   ❌ fixed stuff
 *   ❌ WIP
 */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Type must be one of these
    'type-enum': [
      2,
      'always',
      [
        'feat', // New feature
        'fix', // Bug fix
        'docs', // Documentation only
        'style', // Formatting, no code change
        'refactor', // Code change that neither fixes nor adds
        'perf', // Performance improvement
        'test', // Adding tests
        'build', // Build system or dependencies
        'ci', // CI configuration
        'chore', // Other changes
        'revert', // Revert a commit
      ],
    ],
    // Subject (message) rules
    'subject-case': [2, 'always', 'lower-case'],
    'subject-empty': [2, 'never'],
    'subject-max-length': [2, 'always', 72],
    // Type rules
    'type-case': [2, 'always', 'lower-case'],
    'type-empty': [2, 'never'],
    // Body rules
    'body-max-line-length': [2, 'always', 100],
  },
  helpUrl: 'https://www.conventionalcommits.org/',
};
