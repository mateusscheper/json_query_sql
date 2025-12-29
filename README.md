# JSON Query SQL

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Vue.js](https://img.shields.io/badge/Vue.js-3.5+-4FC08D?logo=vue.js&logoColor=white)](https://vuejs.org/)
[![Vite](https://img.shields.io/badge/Vite-7.3+-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![PrimeVue](https://img.shields.io/badge/PrimeVue-4.5+-007ACC?logo=vue.js&logoColor=white)](https://primevue.org/)

A powerful web application that allows you to execute SQL queries on JSON data.

## Features

- **SELECT**: `*`, specific column names, mixed selection (`column, *`), aggregate functions (COUNT, SUM, AVG, MIN, MAX, LEAST, GREATEST)
- **FROM**: Table paths with dots (`table.subtable`), quoted table names (`"Table Name"`), table aliases (explicit `AS alias` and implicit `table alias`), wildcard navigation (`*`, `*.*`, `*.*.*`, read below), JOIN operations (INNER, LEFT, RIGHT, OUTER)
- **WHERE**: Comparison operators (`=`, `!=`, `<>`, `>`, `<`), pattern matching (LIKE, ILIKE with `%` and `_`), logical operators (AND, OR), alias references (`alias.field`)
- **Advanced Operations**: Common Table Expressions with WITH clause (single and multiple CTEs), UNION and UNION ALL for combining results, LIMIT for result pagination (`LIMIT n` or `LIMIT -1` for unlimited)
- **Wildcard Navigation**: Multi-level JSON traversal using nested wildcards (`*` for one level, `*.*` for two levels, `*.*.*` for three levels, etc.) to dynamically explore JSON structure and combine data from multiple nested objects

## Quick Start

### Prerequisites

- Node.js 18+ (required for ES modules and modern JavaScript features)
- npm 8+ or yarn 1.22+

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/json-query-sql.git
cd json-query-sql

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

### Usage

1. **Upload JSON File**: Click "Selecionar arquivo JSON" to upload your JSON data
2. **Write SQL Query**: Use the textarea to write your SQL query
3. **Execute**: Press `Ctrl+Enter` or click execute to run the query
4. **View Results**: Results appear in the data table below

## Documentation

For detailed SQL syntax and examples, see [DOC.md](DOC.md).

### Supported Features

- **Basic SQL Operations**: SELECT, WHERE, LIMIT with full operator support
- **Wildcard Navigation**: Use `*` to navigate JSON levels dynamically
- **UNION Operations**: Combine results with UNION and UNION ALL
- **Common Table Expressions**: Complex queries with WITH clauses
- **Table Aliases**: Both explicit (AS) and implicit alias formats
- **JOIN Operations**: INNER, LEFT, RIGHT, and OUTER joins
- **Aggregate Functions**: COUNT, SUM, AVG, MIN, MAX, LEAST, GREATEST
- **Advanced Filtering**: Pattern matching with LIKE/ILIKE operators

## Testing

The project includes comprehensive unit tests for the SQL engine:

```bash
# Run tests
npm test

# Run tests with debug output
DEBUG=true npm test
```

## Project Structure

```
json-query-sql/
├── public/
│   └── favicon.ico
├── src/
│   ├── assets/
│   │   └── styles.scss      # Global styles
│   ├── utils/
│   │   ├── sql.utils.js     # Main SQL query logic
│   │   ├── json.utils.js    # JSON manipulation utilities
│   │   ├── cache.js         # Caching system with compression
│   │   └── debug.utils.js   # Debug utilities
│   ├── App.vue              # Main Vue component
│   └── main.js              # Application entry point
├── test/
│   └── sql.utils.test.js    # Unit tests
├── .env.example             # Environment variables template
├── .gitignore
├── package.json
├── vite.config.js           # Vite configuration
└── README.md
```

## Technology Stack

- **Frontend Framework**: Vue.js 3.5+
- **Build Tool**: Vite 7.3+
- **UI Components**: PrimeVue 4.5+
- **Styling**: PrimeFlex, SCSS
- **Data Compression**: Pako (gzip compression)
- **Storage**: IndexedDB for large files, SessionStorage for small files
- **Testing**: Custom test runner with comprehensive SQL engine tests

## Performance Features

- **Smart Caching**: Automatic caching with compression for large JSON files
- **Memory Management**: Efficient handling of large datasets
- **Lazy Loading**: Progressive loading of query results
- **Session Persistence**: Maintains data across browser sessions
- **Compression**: Automatic gzip compression for files > 1MB

## Configuration

Create a `.env` file based on `.env.example`:

```bash
# Enable debug mode (optional)
DEBUG=false
```

## Troubleshooting

### Common Issues

1. **Large File Performance**: Files > 2MB are automatically compressed and cached
2. **Memory Issues**: The app limits results to 100 by default, use `LIMIT -1` to remove limits
3. **JSON Structure**: Ensure your JSON has array structures for table-like queries
4. **Browser Compatibility**: Requires modern browsers with IndexedDB support

### Debug Mode

Enable debug mode to see detailed query execution logs:

```bash
# In .env file
DEBUG=true
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
