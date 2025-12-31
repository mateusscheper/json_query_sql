import {JsonUtils} from './json.utils.js';
import {debugError, debugLog} from './debug.utils.js';

class QueryBuilder {
    constructor(jsonData, cteContext = {}, isInCTE = false) {
        this.jsonData = jsonData;
        this.cteContext = cteContext;
        this.isInCTE = isInCTE;
        this.table = null;
        this.columns = [];
        this.whereClause = null;
        this.results = [];
        this.limitValue = null;
        this.originalLimitValue = null;
        this.totalResults = 0;
        this.isUnion = false;
        this.unionAll = false;
        this.leftQuery = null;
        this.rightQuery = null;
        this.tableAlias = null;
        this.joins = [];
        this.isJoinQuery = false;
        this.orderByClause = null;
    }

    parseQuery(sqlQuery) {
        const query = sqlQuery.trim().replace(/;\s*$/, '');

        if (this.isUnionQuery(query)) {
            return this.parseUnionQuery(query);
        }

        if (SqlUtils.isJoinQuery(query)) {
            return this.parseJoinQuery(query);
        }

        const selectMatch = query.match(/SELECT\s+(.+?)\s+FROM/i);
        const fromMatch = query.match(/FROM\s+(.+?)(?:\s+WHERE|\s+ORDER\s+BY|\s+LIMIT|$)/i);
        const whereMatch = query.match(/WHERE\s+(.+?)(?:\s+ORDER\s+BY|\s+LIMIT|$)/i);
        const orderByMatch = query.match(/ORDER\s+BY\s+(.+?)(?:\s+LIMIT|$)/i);
        const limitMatch = query.match(/LIMIT\s+(-?\d+)/i);

        if (!selectMatch || !fromMatch) {
            throw new Error('Query SQL inválida');
        }

        this.columns = selectMatch[1].trim();
        const fromClause = fromMatch[1].trim();

        const {tablePath, alias} = SqlUtils.parseTableAlias(fromClause);
        this.tablePath = tablePath;
        this.tableAlias = alias;

        this.whereClause = whereMatch ? SqlUtils.getWhereClauseFn(whereMatch[1].trim(), alias, tablePath) : null;
        this.orderByClause = orderByMatch ? SqlUtils.parseOrderBy(orderByMatch[1].trim()) : null;
        this.limitValue = limitMatch ? parseInt(limitMatch[1]) : null;
        this.originalLimitValue = this.limitValue;

        return this;
    }

    isUnionQuery(query) {
        return /\bUNION\s+(ALL\s+)?SELECT\b/i.test(query);
    }

    parseUnionQuery(query) {
        const unionAllMatch = query.match(/(.+?)\s+UNION\s+ALL\s+(.+)/i);
        const unionMatch = query.match(/(.+?)\s+UNION\s+(.+)/i);

        if (unionAllMatch) {
            this.isUnion = true;
            this.unionAll = true;
            this.leftQuery = unionAllMatch[1].trim();
            this.rightQuery = unionAllMatch[2].trim();
        } else if (unionMatch) {
            this.isUnion = true;
            this.unionAll = false;
            this.leftQuery = unionMatch[1].trim();
            this.rightQuery = unionMatch[2].trim();
        }

        return this;
    }

    parseJoinQuery(query) {
        this.isJoinQuery = true;

        const selectMatch = query.match(/SELECT\s+(.+?)\s+FROM/i);
        if (!selectMatch) {
            throw new Error('Query JOIN inválida: SELECT não encontrado');
        }
        this.columns = selectMatch[1].trim();

        const fromToJoinMatch = query.match(/FROM\s+([^\s]+(?:\s+[^\s]+)*)\s+(INNER\s+JOIN|LEFT\s+JOIN|RIGHT\s+JOIN|OUTER\s+JOIN|FULL\s+OUTER\s+JOIN|JOIN)/i);
        if (!fromToJoinMatch) {
            throw new Error('Query JOIN inválida: FROM ou JOIN não encontrado');
        }

        const fromClause = fromToJoinMatch[1].trim();
        const {tablePath, alias} = SqlUtils.parseTableAlias(fromClause);
        this.tablePath = tablePath;
        this.tableAlias = alias;

        this.parseJoins(query);

        const whereMatch = query.match(/WHERE\s+(.+?)(?:\s+ORDER\s+BY|\s+LIMIT|$)/i);
        const orderByMatch = query.match(/ORDER\s+BY\s+(.+?)(?:\s+LIMIT|$)/i);
        const limitMatch = query.match(/LIMIT\s+(-?\d+)/i);

        this.whereClause = whereMatch ? SqlUtils.getWhereClauseFn(whereMatch[1].trim()) : null;
        this.orderByClause = orderByMatch ? SqlUtils.parseOrderBy(orderByMatch[1].trim()) : null;
        this.limitValue = limitMatch ? parseInt(limitMatch[1]) : null;
        this.originalLimitValue = this.limitValue;

        return this;
    }

    parseJoins(query) {
        const joinPattern = /(INNER\s+JOIN|LEFT\s+JOIN|RIGHT\s+JOIN|OUTER\s+JOIN|FULL\s+OUTER\s+JOIN|JOIN)\s+([^\s]+(?:\s+[^\s]+)*)\s+ON\s+([^\s]+\s*[=<>!]+\s*[^\s]+)/gi;

        let match;
        while ((match = joinPattern.exec(query)) !== null) {
            const joinType = match[1].trim().toUpperCase();
            const tableClause = match[2].trim();
            const onCondition = match[3].trim();

            const {tablePath, alias} = SqlUtils.parseTableAlias(tableClause);

            this.joins.push({
                type: joinType === 'JOIN' ? 'INNER JOIN' : joinType,
                tablePath,
                alias,
                onCondition
            });
        }
    }

    selectFrom(tablePath) {
        const path = tablePath || this.tablePath;

        if (this.cteContext[path]) {
            this.table = this.cteContext[path];
            return this;
        }

        if (SqlUtils.isWildcardPath(path)) {
            this.table = SqlUtils.expandWildcardPath(this.jsonData, path);
        } else {
            const parts = path.split('.');
            let current = this.jsonData;

            for (const part of parts) {
                const cleanPart = part.startsWith('"') && part.endsWith('"') ? part.slice(1, -1) : part;
                if (current && typeof current === 'object' && cleanPart in current) {
                    current = current[cleanPart];
                } else {
                    current = null;
                    break;
                }
            }

            this.table = current;
        }

        return this;
    }

    validateTable() {
        if (!this.table) {
            throw new Error(`Table not found: ${this.tablePath}`);
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
        let allResults = dataRows
            .map(row => SqlUtils.assembleRowData(row, this.columns, this.whereClause))
            .filter(row => Object.keys(row).length > 0);

        if (this.orderByClause) {
            allResults = SqlUtils.applyOrderBy(allResults, this.orderByClause, this.columns);
        }

        this.totalResults = allResults.length;

        if (this.limitValue === -1) {
            this.results = allResults;
        } else if (this.limitValue && this.limitValue > 0) {
            this.results = allResults.slice(0, this.limitValue);
        } else if (this.limitValue === null && this.isInCTE) {
            this.results = allResults;
        } else if (this.limitValue === null) {
            this.results = allResults.slice(0, 100);
        } else {
            this.results = allResults.slice(0, 100);
        }

        return this;
    }

    build() {
        if (this.isUnion) {
            return this.executeUnion();
        }

        if (this.isJoinQuery) {
            return this.executeJoin();
        }

        return {
            results: this.results,
            totalResults: this.totalResults,
            limited: this.limitValue !== -1 && this.totalResults > (this.limitValue || 100),
            hasExplicitLimit: this.originalLimitValue !== null
        };
    }

    executeUnion() {
        const leftResult = SqlUtils.executeSQL(this.jsonData, this.leftQuery, this.cteContext, this.isInCTE);
        const rightResult = SqlUtils.executeSQL(this.jsonData, this.rightQuery, this.cteContext, this.isInCTE);
        const totalResults = leftResult.totalResults + rightResult.totalResults;

        let combinedResults = [...leftResult.results, ...rightResult.results];

        if (!this.unionAll) {
            const seen = new Set();
            combinedResults = combinedResults.filter(row => {
                const key = JSON.stringify(row);
                if (seen.has(key)) {
                    return false;
                }
                seen.add(key);
                return true;
            });
        }

        let limitValue = this.limitValue;
        if (limitValue === null && !this.isInCTE) {
            limitValue = 100;
        }

        const limited = limitValue !== null && limitValue !== -1 && combinedResults.length > limitValue;

        if (limitValue === -1) {
        } else if (limitValue !== null) {
            combinedResults = combinedResults.slice(0, limitValue);
        }

        return {
            results: combinedResults,
            totalResults: totalResults,
            limited: limited,
            hasExplicitLimit: this.originalLimitValue !== null
        };
    }

    executeJoin() {
        const mainTable = this.getTableData(this.tablePath);
        if (!Array.isArray(mainTable)) {
            throw new Error('Tabela principal deve ser um array para JOIN');
        }

        let results = [];

        for (const mainRow of mainTable) {
            let currentRows = [mainRow];

            for (const join of this.joins) {
                const joinTable = this.getTableData(join.tablePath);
                if (!Array.isArray(joinTable)) {
                    continue;
                }

                const newRows = [];

                for (const currentRow of currentRows) {
                    let hasMatch = false;

                    for (const joinRow of joinTable) {
                        if (this.evaluateJoinCondition(currentRow, joinRow, join)) {
                            hasMatch = true;
                            const combinedRow = {...currentRow};

                            Object.keys(joinRow).forEach(key => {
                                const fieldName = join.alias ? `${join.alias}_${key}` : key;
                                combinedRow[fieldName] = joinRow[key];
                            });

                            newRows.push(combinedRow);
                        }
                    }

                    if (!hasMatch && (join.type === 'LEFT JOIN' || join.type === 'OUTER JOIN')) {
                        const combinedRow = {...currentRow};
                        if (joinTable.length > 0) {
                            Object.keys(joinTable[0]).forEach(key => {
                                const fieldName = join.alias ? `${join.alias}_${key}` : key;
                                combinedRow[fieldName] = null;
                            });
                        }
                        newRows.push(combinedRow);
                    }
                }

                currentRows = newRows;
            }

            results = results.concat(currentRows);
        }

        if (this.whereClause) {
            results = results.filter(row => {
                try {
                    return this.whereClause.call(row);
                } catch (e) {
                    return false;
                }
            });
        }

        if (this.orderByClause) {
            results = SqlUtils.applyOrderBy(results, this.orderByClause, SqlUtils.buildColumnList(this.columns, results[0]));
        }

        const processedResults = this.processJoinColumns(results);

        this.totalResults = processedResults.length;

        let limitValue = this.limitValue;
        if (limitValue === null && !this.isInCTE) {
            limitValue = 100;
        }

        const limited = limitValue !== null && limitValue !== -1 && processedResults.length > limitValue;

        if (limitValue === -1) {
            this.results = processedResults;
        } else if (limitValue !== null) {
            this.results = processedResults.slice(0, limitValue);
        } else {
            this.results = processedResults;
        }

        return {
            results: this.results,
            totalResults: this.totalResults,
            limited: limited,
            hasExplicitLimit: this.originalLimitValue !== null
        };
    }

    evaluateJoinCondition(leftRow, rightRow, join) {
        const condition = join.onCondition;
        const match = condition.match(/(\w+)\.(\w+)\s*=\s*(\w+)\.(\w+)/);

        if (match) {
            const [, leftAlias, leftField, rightAlias, rightField] = match;

            if ((leftAlias === this.tableAlias || leftAlias === this.tablePath.split('.').pop()) &&
                (rightAlias === join.alias || rightAlias === join.tablePath.split('.').pop())) {
                return leftRow[leftField] === rightRow[rightField];
            }

            if ((rightAlias === this.tableAlias || rightAlias === this.tablePath.split('.').pop()) &&
                (leftAlias === join.alias || leftAlias === join.tablePath.split('.').pop())) {
                return rightRow[leftField] === leftRow[rightField];
            }
        }

        return false;
    }

    getTableData(tablePath) {
        if (this.cteContext[tablePath]) {
            return this.cteContext[tablePath];
        }

        if (SqlUtils.isWildcardPath(tablePath)) {
            return SqlUtils.expandWildcardPath(this.jsonData, tablePath);
        } else {
            const parts = tablePath.split('.');
            let current = this.jsonData;

            for (const part of parts) {
                const cleanPart = part.startsWith('"') && part.endsWith('"') ? part.slice(1, -1) : part;
                if (current && typeof current === 'object' && cleanPart in current) {
                    current = current[cleanPart];
                } else {
                    return [];
                }
            }

            return current || [];
        }
    }

    processJoinColumns(results) {
        if (results.length === 0) return [];

        const columns = SqlUtils.buildColumnList(this.columns, results[0]);

        return results.map(row => {
            const processedRow = {};
            columns.forEach(col => {
                if (row.hasOwnProperty(col)) {
                    processedRow[col] = row[col];
                }
            });
            return processedRow;
        });
    }
}

export class SqlUtils {
    static executeSQL(jsonData, sqlQuery, cteContext = {}, isInCTE = false) {
        if (SqlUtils.isWithQuery(sqlQuery)) {
            return SqlUtils.executeWithQuery(jsonData, sqlQuery);
        }

        const builder = new QueryBuilder(jsonData, cteContext, isInCTE).parseQuery(sqlQuery);

        if (builder.isUnion || builder.isJoinQuery) {
            return builder.build();
        }

        if (!isInCTE && builder.limitValue === null) {
            builder.limitValue = 100;
        }

        return builder
            .selectFrom()
            .validateTable()
            .processColumns()
            .applyFilter()
            .applyLimit()
            .build();
    }

    static isWithQuery(query) {
        return /^\s*WITH\s+/i.test(query.trim());
    }

    static isJoinQuery(query) {
        return /\b(INNER\s+)?JOIN\b|\bLEFT\s+JOIN\b|\bRIGHT\s+JOIN\b|\bOUTER\s+JOIN\b|\bFULL\s+OUTER\s+JOIN\b/i.test(query);
    }

    static executeWithQuery(jsonData, sqlQuery) {
        const query = sqlQuery.trim();

        let parenDepth = 0;
        let inString = false;
        let stringChar = null;
        let selectIndex = -1;

        for (let i = 0; i < query.length; i++) {
            const char = query[i];
            const prevChar = i > 0 ? query[i - 1] : null;

            if (!inString && (char === '"' || char === "'")) {
                inString = true;
                stringChar = char;
            } else if (inString && char === stringChar && prevChar !== '\\') {
                inString = false;
                stringChar = null;
            } else if (!inString) {
                if (char === '(') {
                    parenDepth++;
                } else if (char === ')') {
                    parenDepth--;
                } else if (parenDepth === 0 && query.substring(i).match(/^SELECT\s+/i)) {
                    selectIndex = i;
                    break;
                }
            }
        }

        if (selectIndex === -1) {
            throw new Error('Sintaxe WITH inválida: SELECT principal não encontrado');
        }

        const withClause = query.substring(4, selectIndex).trim();
        const mainQuery = query.substring(selectIndex).trim();

        const cteContext = SqlUtils.parseWithClause(jsonData, withClause);

        return SqlUtils.executeSQL(jsonData, mainQuery, cteContext);
    }

    static parseWithClause(jsonData, withClause) {
        const cteContext = {};

        const ctes = SqlUtils.splitCTEs(withClause);

        for (const cte of ctes) {
            const cteMatch = cte.trim().match(/^(\w+)\s+AS\s*\((.+)\)$/is);
            if (!cteMatch) {
                throw new Error(`Sintaxe CTE inválida: ${cte}`);
            }

            const cteName = cteMatch[1].trim();
            let cteQuery = cteMatch[2].trim();

            const cteResult = SqlUtils.executeSQL(jsonData, cteQuery, cteContext, true);
            cteContext[cteName] = cteResult.results;
        }

        return cteContext;
    }

    static parseTableAlias(fromClause) {
        fromClause = fromClause.trim();

        const asMatch = fromClause.match(/^(.+?)\s+AS\s+(\w+)$/i);
        if (asMatch) {
            return {tablePath: asMatch[1].trim(), alias: asMatch[2].trim()};
        }

        const quotedTableMatch = fromClause.match(/^(.+?"[^"]+")\s+(\w+)$/);
        if (quotedTableMatch) {
            return {tablePath: quotedTableMatch[1].trim(), alias: quotedTableMatch[2].trim()};
        }

        const normalTableMatch = fromClause.match(/^([^\s]+\.[^\s]+)\s+(\w+)$/);
        if (normalTableMatch) {
            return {tablePath: normalTableMatch[1].trim(), alias: normalTableMatch[2].trim()};
        }

        return {tablePath: fromClause, alias: null};
    }

    static splitCTEs(withClause) {
        const ctes = [];
        let current = '';
        let parenDepth = 0;
        let inString = false;
        let stringChar = null;

        for (let i = 0; i < withClause.length; i++) {
            const char = withClause[i];
            const prevChar = i > 0 ? withClause[i - 1] : null;

            if (!inString && (char === '"' || char === "'")) {
                inString = true;
                stringChar = char;
            } else if (inString && char === stringChar && prevChar !== '\\') {
                inString = false;
                stringChar = null;
            } else if (!inString) {
                if (char === '(') {
                    parenDepth++;
                } else if (char === ')') {
                    parenDepth--;
                } else if (char === ',' && parenDepth === 0) {
                    ctes.push(current.trim());
                    current = '';
                    continue;
                }
            }

            current += char;
        }

        if (current.trim()) {
            ctes.push(current.trim());
        }

        return ctes;
    }

    static buildColumnList(columnDefinition, sourceData) {
        class ColumnListBuilder {
            constructor(data) {
                if (Array.isArray(data) && data.length > 0) {
                    const allKeys = new Set();
                    data.forEach(item => {
                        if (item && typeof item === 'object') {
                            Object.keys(item).forEach(key => allKeys.add(key));
                        }
                    });
                    this.referenceRow = Object.fromEntries(Array.from(allKeys).map(key => [key, null]));
                } else {
                    this.referenceRow = Array.isArray(data) ? data[0] : data;
                }
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
                if (str.includes('*') && str.includes(',')) {
                    const parts = str.split(',').map(c => c.trim());
                    const specificColumns = [];
                    let hasWildcard = false;

                    parts.forEach(part => {
                        if (part === '*') {
                            hasWildcard = true;
                        } else {
                            specificColumns.push(part);
                        }
                    });

                    if (hasWildcard) {
                        const allColumns = Object.keys(this.referenceRow);
                        const remainingColumns = allColumns.filter(col => !specificColumns.includes(col));
                        this.columns = [...specificColumns, ...remainingColumns];
                        return this;
                    }
                }

                this.columns = str.includes(',')
                    ? str.split(',').map(c => c.trim())
                    : [str.trim()];
                return this;
            }

            validate() {
                return this.columns;
            }
        }

        const builder = new ColumnListBuilder(sourceData);

        if (columnDefinition === '*') return builder.fromWildcard().validate();
        if (Array.isArray(columnDefinition)) return builder.fromArray(columnDefinition).validate();
        if (typeof columnDefinition === 'string') return builder.fromString(columnDefinition).validate();

        return [];
    }

    static getWhereClauseFn(jsString, tableAlias = null, tablePath = null) {
        if (!jsString || jsString.trim() === "") {
            return function () {
                return true;
            };
        }

        try {
            let jsCode = jsString;

            if (tableAlias) {
                const aliasRegex = new RegExp(`\\b${tableAlias}\\.(\\w+)`, 'g');
                jsCode = jsCode.replace(aliasRegex, '$1');
            }

            if (tablePath) {
                const escapedTablePath = tablePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const tableRegex = new RegExp(`\\b${escapedTablePath}\\.(\\w+)`, 'g');
                jsCode = jsCode.replace(tableRegex, '$1');
            }

            jsCode = jsCode
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

            let values;
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

    static isWildcardPath(path) {
        return path.includes('*');
    }

    static expandWildcardPath(jsonData, path) {
        const parts = path.split('.');

        function processWildcard(obj, remainingParts) {
            if (remainingParts.length === 0) {
                if (Array.isArray(obj)) {
                    return obj;
                } else if (obj && typeof obj === 'object') {
                    let items = [];
                    Object.keys(obj).forEach(key => {
                        const value = obj[key];
                        if (Array.isArray(value)) {
                            items = items.concat(value);
                        }
                    });
                    return items;
                }
                return [];
            }

            const [currentPart, ...restParts] = remainingParts;
            let collected = [];

            if (currentPart === '*') {
                if (Array.isArray(obj)) {
                    obj.forEach(item => {
                        const subResult = processWildcard(item, restParts);
                        collected = collected.concat(subResult);
                    });
                } else if (obj && typeof obj === 'object') {
                    Object.keys(obj).forEach(key => {
                        const value = obj[key];
                        const subResult = processWildcard(value, restParts);
                        collected = collected.concat(subResult);
                    });
                }
            } else {
                const cleanPart = currentPart.startsWith('"') && currentPart.endsWith('"')
                    ? currentPart.slice(1, -1)
                    : currentPart;

                if (obj && typeof obj === 'object' && cleanPart in obj) {
                    const subResult = processWildcard(obj[cleanPart], restParts);
                    collected = collected.concat(subResult);
                }
            }

            return collected;
        }

        return processWildcard(jsonData, parts);
    }

    static parseOrderBy(orderByClause) {
        return orderByClause.split(',').map(col => {
            const trimmed = col.trim();
            const parts = trimmed.split(/\s+/);
            const column = parts[0];

            // Find the last valid direction keyword
            let direction = 'ASC';
            for (let i = parts.length - 1; i >= 1; i--) {
                const part = parts[i].toUpperCase();
                if (part === 'DESC' || part === 'ASC') {
                    direction = part;
                    break;
                }
            }

            return {column, direction};
        });
    }

    static applyOrderBy(results, orderByClause, columnList = null) {
        if (!orderByClause || orderByClause.length === 0) {
            return results;
        }

        const mappedOrderBy = orderByClause.map(({column, direction}) => {
            if (/^\d+$/.test(column) && columnList) {
                const position = parseInt(column) - 1;
                if (position >= 0 && position < columnList.length) {
                    return {column: columnList[position], direction};
                }
            }
            return {column, direction};
        });

        return results.sort((a, b) => {
            for (const {column, direction} of mappedOrderBy) {
                let aVal = a[column];
                let bVal = b[column];

                if (aVal === null || aVal === undefined) aVal = '';
                if (bVal === null || bVal === undefined) bVal = '';

                if (typeof aVal === 'string' && typeof bVal === 'string') {
                    const comparison = aVal.localeCompare(bVal);
                    if (comparison !== 0) {
                        return direction === 'DESC' ? -comparison : comparison;
                    }
                } else {
                    const numA = Number(aVal);
                    const numB = Number(bVal);

                    if (!isNaN(numA) && !isNaN(numB)) {
                        if (numA !== numB) {
                            return direction === 'DESC' ? numB - numA : numA - numB;
                        }
                    } else {
                        const comparison = String(aVal).localeCompare(String(bVal));
                        if (comparison !== 0) {
                            return direction === 'DESC' ? -comparison : comparison;
                        }
                    }
                }
            }
            return 0;
        });
    }
}