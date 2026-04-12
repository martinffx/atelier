# README Structure

## Quick Template

```markdown
# Project Name

One-sentence description.

[![Build](https://img.shields.io/badge/build-passing-green)](link)
[![Version](https://img.shields.io/npm/v/package.svg)](link)
[![License](https://img.shields.io/badge/license-MIT-blue)](link)

## Features

- Feature 1
- Feature 2
- Feature 3

## Quick Start

```bash
npm install package-name
npm start
```

## Installation

### Prerequisites

- Node.js 18+
- npm 9+

### Steps

1. Clone repo
2. Install deps: npm install
3. Configure: cp .env.example .env
4. Run: npm run dev

## Usage

```javascript
const pkg = require('package-name');

pkg.doSomething();
```

## API

See [API Documentation](docs/api.md).

## Configuration

| Env | Description | Default |
|-----|-------------|---------|
| PORT | Server port | 3000 |
| DB_URL | Database connection | localhost |

## Development

```bash
npm run dev    # Start dev server
npm test       # Run tests
npm run lint   # Lint
```

## Contributing

1. Fork
2. Branch: feature/my-feature
3. Commit
4. PR

## License

MIT
```

## Sections to Include

| Section | Required | Description |
|---------|----------|-------------|
| Title + Badges | Yes | Project name, version, status |
| Description | Yes | What it does |
| Features | Yes | Key capabilities |
| Quick Start | Yes | 3-5 commands |
| Installation | No | Detailed setup |
| Usage | No | Code examples |
| API | No | For libraries |
| Configuration | No | Env vars, settings |
| Development | No | Dev commands |
| Contributing | No | How to contribute |
| License | Yes | Open source license |
