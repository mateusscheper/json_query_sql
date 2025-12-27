export const JsonUtils = {
    getJsonObject(obj, path, condition) {
        if (condition && !condition(obj)) return undefined;

        const keys = path.split('.').map(key => {
            return key.startsWith('"') && key.endsWith('"')
                ? key.slice(1, -1)
                : key;
        });

        return keys.reduce((current, key) => {
            return (current && typeof current === 'object' && key in current)
                ? current[key]
                : undefined;
        }, obj);
    },

    containsPathSeparator(path) {
        return path.includes('.');
    },

    formatValue(value) {
        if (Array.isArray(value)) {
            return `[... ${value.length} items]`;
        } else if (typeof value === 'object' && value !== null) {
            const keyCount = Object.keys(value).length;
            return `{... ${keyCount} keys}`;
        }
        return value;
    },

    getJsonSummary(jsonObj) {
        const summary = {
            rootItemCount: 0,
            keys: [],
            maxDepth: 0,
            tables: []
        };

        function analyzeObject(obj, path = '', depth = 0) {
            if (depth > summary.maxDepth) {
                summary.maxDepth = depth;
            }

            if (Array.isArray(obj)) {
                const tableName = path || 'root';
                if (!summary.tables.includes(tableName)) {
                    summary.tables.push(tableName);
                }

                summary.keys.push({
                    name: tableName,
                    type: 'array',
                    count: obj.length,
                    depth: depth
                });

                if (path === '') {
                    summary.rootItemCount = obj.length;
                }

                if (obj.length > 0 && typeof obj[0] === 'object' && obj[0] !== null) {
                    const firstItem = obj[0];
                    Object.keys(firstItem).forEach(key => {
                        const value = firstItem[key];
                        const subPath = tableName + '.' + key;
                        if (typeof value === 'object' && value !== null) {
                            analyzeObject(value, subPath, depth + 1);
                        }
                    });
                }
            } else if (typeof obj === 'object' && obj !== null) {
                const keys = Object.keys(obj);

                if (path === '') {
                    if (Array.isArray(obj)) {
                        summary.rootItemCount = obj.length;
                    } else {
                        summary.rootItemCount = keys.length;
                    }
                }

                keys.forEach(key => {
                    const value = obj[key];
                    const currentPath = path ? `${path}.${key}` : key;

                    if (Array.isArray(value)) {
                        if (!summary.tables.includes(currentPath)) {
                            summary.tables.push(currentPath);
                        }
                        summary.keys.push({
                            name: currentPath,
                            type: 'array',
                            count: value.length,
                            depth: depth + 1
                        });
                        analyzeObject(value, currentPath, depth + 1);
                    } else if (typeof value === 'object' && value !== null) {
                        summary.keys.push({
                            name: currentPath,
                            type: 'object',
                            count: Object.keys(value).length,
                            depth: depth + 1
                        });
                        analyzeObject(value, currentPath, depth + 1);
                    }
                });
            }
        }

        analyzeObject(jsonObj);
        return summary;
    }
};