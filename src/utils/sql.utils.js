import {JsonUtils} from './json.utils.js';
import {debugError, debugLog} from './debug.utils.js';

class QueryBuilder {
    constructor(jsonData) {
        this.jsonData = jsonData;
        this.table = null;
        this.columns = [];
        this.whereClause = null;
        this.results = [];
        this.limitValue = null;
        this.totalResults = 0;
    }

    parseQuery(sqlQuery) {
        const query = sqlQuery.trim().replace(/;\s*$/, '');

        const selectMatch = query.match(/SELECT\s+(.+?)\s+FROM/i);
        const fromMatch = query.match(/FROM\s+(.+?)(?:\s+WHERE|\s+LIMIT|$)/i);
        const whereMatch = query.match(/WHERE\s+(.+?)(?:\s+LIMIT|$)/i);
        const limitMatch = query.match(/LIMIT\s+(-?\d+)/i);

        if (!selectMatch || !fromMatch) {
            throw new Error('Query SQL inválida');
        }

        this.columns = selectMatch[1].trim();
        this.tablePath = fromMatch[1].trim();
        this.whereClause = whereMatch ? SqlUtils.getWhereClauseFn(whereMatch[1].trim()) : null;
        this.limitValue = limitMatch ? parseInt(limitMatch[1]) : null;

        return this;
    }

    selectFrom(tablePath) {
        this.table = JsonUtils.getJsonObject(this.jsonData, tablePath || this.tablePath);
        return this;
    }

    validateTable() {
        if (!SqlUtils.acceptsQueryOperations(this.table)) {
            throw new Error('Table cannot be queried');
        }
        return this;
    }

    processColumns(columnNames) {
        if (SqlUtils.isAggregateQuery(columnNames || this.columns)) {
            this.results = SqlUtils.executeAggregateQuery(columnNames || this.columns, this.table, this.whereClause);
            return this;
        }

        this.columns = SqlUtils.buildColumnList(columnNames || this.columns, this.table);
        if (this.columns.length === 0) {
            throw new Error('No valid columns found');
        }
        return this;
    }

    applyFilter(whereClauseFn) {
        this.whereClause = whereClauseFn || this.whereClause;
        return this;
    }

    applyLimit() {
        if (this.results.length > 0) {
            this.totalResults = this.results.length;
            return this;
        }

        const dataRows = Array.isArray(this.table) ? this.table : [this.table];
        const allResults = dataRows
            .map(row => SqlUtils.assembleRowData(row, this.columns, this.whereClause))
            .filter(row => Object.keys(row).length > 0);

        this.totalResults = allResults.length;

        if (this.limitValue === -1) {
            this.results = allResults;
        } else if (this.limitValue && this.limitValue > 0) {
            this.results = allResults.slice(0, this.limitValue);
        } else {
            this.results = allResults.slice(0, 100);
        }

        return this;
    }

    build() {
        return {
            results: this.results,
            totalResults: this.totalResults,
            limited: this.limitValue !== -1 && this.totalResults > (this.limitValue || 100)
        };
    }
}

export class SqlUtils {
    static executeSQL(jsonData, sqlQuery) {
        try {
            return new QueryBuilder(jsonData)
                .parseQuery(sqlQuery)
                .selectFrom()
                .validateTable()
                .processColumns()
                .applyFilter()
                .applyLimit()
                .build();
        } catch (error) {
            debugError('Query execution failed:', error);
            return {results: [], totalResults: 0, limited: false};
        }
    }

    static acceptsQueryOperations(target) {
        const isNull = target === null;
        const isUndefined = target === undefined;
        const isFunction = typeof target === 'function';
        const isObject = typeof target === 'object';

        return !isNull && !isUndefined && !isFunction && isObject;
    }

    static buildColumnList(columnDefinition, sourceData) {
        class ColumnListBuilder {
            constructor(data) {
                this.referenceRow = Array.isArray(data) ? data[0] : data;
                this.columns = [];
            }

            fromWildcard() {
                this.columns = Object.keys(this.referenceRow);
                return this;
            }

            fromArray(arr) {
                this.columns = arr;
                return this;
            }

            fromString(str) {
                this.columns = str.includes(',')
                    ? str.split(',').map(c => c.trim())
                    : [str.trim()];
                return this;
            }

            validate() {
                return SqlUtils.isValidColumn(this.columns, this.referenceRow)
                    ? this.columns
                    : [];
            }
        }

        const builder = new ColumnListBuilder(sourceData);

        if (columnDefinition === '*') return builder.fromWildcard().validate();
        if (Array.isArray(columnDefinition)) return builder.fromArray(columnDefinition).validate();
        if (typeof columnDefinition === 'string') return builder.fromString(columnDefinition).validate();

        return [];
    }

    static isValidColumn(columns, tableObj) {
        for (let i = 0; i < columns.length; i++) {
            const columnName = columns[i];
            if (!columnName || columnName.trim() === '') {
                return false;
            }

            if (JsonUtils.containsPathSeparator(columnName)) {
                const valueObj = JsonUtils.getJsonObject(tableObj, columnName);
                if (valueObj === undefined || typeof valueObj === 'function') {
                    return false;
                }
            } else if (!tableObj.hasOwnProperty(columnName)) {
                return false;
            }
        }
        return true;
    }

    static getWhereClauseFn(jsString) {
        if (!jsString || jsString.trim() === "") {
            return function () {
                return true;
            };
        }

        try {
            let jsCode = jsString
                .replace(/\b(\w+)\s+ILIKE\s+'([^']*)'/gi, (match, field, pattern) => {
                    const regexPattern = pattern.replace(/%/g, '.*').replace(/_/g, '.');
                    return `(this.${field} && /${regexPattern}/i.test(this.${field}))`;
                })
                .replace(/\b(\w+)\s+LIKE\s+'([^']*)'/gi, (match, field, pattern) => {
                    const regexPattern = pattern.replace(/%/g, '.*').replace(/_/g, '.');
                    return `(this.${field} && /${regexPattern}/.test(this.${field}))`;
                })
                .replace(/\b(\w+)\s*!=\s*'([^']*)'/g, 'this.$1 !== "$2"')
                .replace(/\b(\w+)\s*<>\s*'([^']*)'/g, 'this.$1 !== "$2"')
                .replace(/\b(\w+)\s*!=\s*(\d+)/g, 'this.$1 !== $2')
                .replace(/\b(\w+)\s*<>\s*(\d+)/g, 'this.$1 !== $2')
                .replace(/\b(\w+)\s*=\s*'([^']*)'/g, 'this.$1 === "$2"')
                .replace(/\b(\w+)\s*=\s*"([^"]*)"/g, 'this.$1 === "$2"')
                .replace(/\b(\w+)\s*=\s*(\d+)/g, 'this.$1 === $2')
                .replace(/\b(\w+)\s*>\s*(\d+)/g, 'this.$1 > $2')
                .replace(/\b(\w+)\s*<\s*(\d+)/g, 'this.$1 < $2')
                .replace(/\bAND\b/gi, '&&')
                .replace(/\bOR\b/gi, '||');

            debugLog('WHERE clause converted:', jsString, '->', jsCode);
            return new Function('return (' + jsCode + ');');
        } catch (e) {
            debugError('Erro na cláusula WHERE:', e);
            return null;
        }
    }

    static assembleRowData(inputRow, columnSpec, whereCondition, aliasMap) {
        class RowDataBuilder {
            constructor(row) {
                this.sourceRow = row;
                this.resultData = {};
                this.shouldProcess = true;
            }

            applyFilter(condition) {
                if (condition) {
                    try {
                        this.shouldProcess = condition.call(this.sourceRow);
                    } catch (e) {
                        debugError('Row filter error:', e);
                        this.shouldProcess = false;
                    }
                }
                return this;
            }

            withColumns(columns, aliases) {
                if (!this.shouldProcess) return this;

                const fieldNames = aliases || this.generateAliases(columns);

                columns.forEach((column, index) => {
                    const fieldValue = this.extractValue(column);
                    if (fieldValue !== undefined) {
                        this.resultData[fieldNames[index]] = JsonUtils.formatValue(fieldValue);
                    }
                });

                return this;
            }

            extractValue(fieldPath) {
                return JsonUtils.containsPathSeparator(fieldPath)
                    ? JsonUtils.getJsonObject(this.sourceRow, fieldPath)
                    : this.sourceRow[fieldPath];
            }

            generateAliases(columns) {
                return columns.map(col =>
                    JsonUtils.containsPathSeparator(col)
                        ? col.split('.').join('->')
                        : col
                );
            }

            build() {
                return this.resultData;
            }
        }

        return new RowDataBuilder(inputRow)
            .applyFilter(whereCondition)
            .withColumns(columnSpec, aliasMap)
            .build();
    }

    static isAggregateQuery(columnNames) {
        const aggregateFunctions = /\b(COUNT|SUM|AVG|MIN|MAX|LEAST|GREATEST)\s*\(/i;
        return aggregateFunctions.test(columnNames);
    }

    static executeAggregateQuery(columnNames, table, whereClauseFn) {
        debugLog('Executing aggregate query:', columnNames);

        let filteredData = Array.isArray(table) ? table : [table];

        if (whereClauseFn) {
            filteredData = filteredData.filter(row => {
                try {
                    return whereClauseFn.call(row);
                } catch (e) {
                    return false;
                }
            });
        }

        const result = {};
        const functions = columnNames.match(/(\w+)\s*\(([^)]*)\)/gi) || [];

        functions.forEach(func => {
            const match = func.match(/(\w+)\s*\(([^)]*)\)/i);
            if (!match) return;

            const funcName = match[1].toUpperCase();
            const field = match[2].trim();

            let values = [];
            if (field === '*') {
                values = filteredData;
            } else {
                values = filteredData.map(row => row[field]).filter(val => val !== undefined && val !== null);
            }

            switch (funcName) {
                case 'COUNT':
                    result[func] = field === '*' ? filteredData.length : values.length;
                    break;
                case 'SUM':
                    result[func] = values.reduce((sum, val) => sum + (Number(val) || 0), 0);
                    break;
                case 'AVG':
                    const numValues = values.filter(val => !isNaN(Number(val)));
                    result[func] = numValues.length > 0 ? numValues.reduce((sum, val) => sum + Number(val), 0) / numValues.length : 0;
                    break;
                case 'MIN':
                    result[func] = values.length > 0 ? Math.min(...values.map(v => Number(v) || Infinity)) : null;
                    break;
                case 'MAX':
                    result[func] = values.length > 0 ? Math.max(...values.map(v => Number(v) || -Infinity)) : null;
                    break;
                case 'LEAST':
                    result[func] = values.length > 0 ? Math.min(...values.map(v => Number(v) || Infinity)) : null;
                    break;
                case 'GREATEST':
                    result[func] = values.length > 0 ? Math.max(...values.map(v => Number(v) || -Infinity)) : null;
                    break;
            }
        });

        return [result];
    }
}