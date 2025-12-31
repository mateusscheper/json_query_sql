# SQL Features Documentation

This system supports a comprehensive set of SQL operations for querying JSON data. Each feature includes wildcard support, filtering capabilities, and integration with other SQL operations.

| Feature                      | Description                                   | Example                                                                                |
|------------------------------|-----------------------------------------------|----------------------------------------------------------------------------------------|
| **Basic SELECT**             | Select all or specific columns from tables    | `SELECT * FROM table`                                                                  |
| **Column Selection**         | Choose specific columns or mix with wildcard  | `SELECT id, name FROM table`                                                           |
| **WHERE Filtering**          | Filter records with various operators         | `SELECT * FROM table WHERE id = 1`                                                     |
| **LIKE/ILIKE**               | Pattern matching (case sensitive/insensitive) | `SELECT * FROM table WHERE name LIKE '%test%'`                                         |
| **ORDER BY**                 | Sort results by one or more columns           | `SELECT * FROM table ORDER BY name ASC`                                                |
| **ORDER BY Position**        | Sort by column position (1-based indexing)    | `SELECT * FROM table ORDER BY 1, 2 DESC`                                               |
| **Aggregate Functions**      | COUNT, SUM, AVG, MIN, MAX operations          | `SELECT COUNT(*) FROM table`                                                           |
| **LIMIT**                    | Restrict number of results                    | `SELECT * FROM table LIMIT 10`                                                         |
| **Wildcard Navigation**      | Navigate JSON levels with asterisk            | `SELECT * FROM audios.*`                                                               |
| **Multi-level Wildcards**    | Deep JSON navigation                          | `SELECT * FROM *.*.*`                                                                  |
| **UNION**                    | Combine results removing duplicates           | `SELECT * FROM table1 UNION SELECT * FROM table2`                                      |
| **UNION ALL**                | Combine results keeping duplicates            | `SELECT * FROM table1 UNION ALL SELECT * FROM table2`                                  |
| **Common Table Expressions** | Temporary tables with WITH clause             | `WITH temp AS (SELECT * FROM table) SELECT * FROM temp`                                |
| **Multiple CTEs**            | Multiple temporary tables                     | `WITH t1 AS (...), t2 AS (...) SELECT * FROM t1`                                       |
| **Table Aliases (AS)**       | Explicit table aliasing                       | `SELECT * FROM table AS t WHERE t.id = 1`                                              |
| **Table Aliases (Implicit)** | Implicit table aliasing                       | `SELECT * FROM table t WHERE t.id = 1`                                                 |
| **INNER JOIN**               | Join tables on matching conditions            | `SELECT * FROM table1 t1 JOIN table2 t2 ON t1.id = t2.id`                              |
| **LEFT JOIN**                | Left outer join with null padding             | `SELECT * FROM table1 t1 LEFT JOIN table2 t2 ON t1.id = t2.id`                         |
| **RIGHT JOIN**               | Right outer join with null padding            | `SELECT * FROM table1 t1 RIGHT JOIN table2 t2 ON t1.id = t2.id`                        |
| **OUTER JOIN**               | Full outer join (alias for FULL OUTER JOIN)   | `SELECT * FROM table1 t1 OUTER JOIN table2 t2 ON t1.id = t2.id`                        |
| **FULL OUTER JOIN**          | Full outer join with null padding             | `SELECT * FROM table1 t1 FULL OUTER JOIN table2 t2 ON t1.id = t2.id`                   |
| **Complex WHERE**            | Multiple conditions with AND/OR               | `SELECT * FROM table WHERE id > 1 AND name LIKE '%test%'`                              |
| **Quoted Table Names**       | Tables with spaces or special chars           | `SELECT * FROM "Table Name" WHERE field = 'value'`                                     |
| **Nested JSON Paths**        | Access nested object properties               | `SELECT * FROM parent.child.grandchild`                                                |
| **Mixed Queries**            | Combine multiple features                     | `WITH filtered AS (SELECT * FROM audios.* WHERE id > 1) SELECT COUNT(*) FROM filtered` |

## ORDER BY Clause

The ORDER BY clause sorts query results by one or more columns in ascending (ASC) or descending (DESC) order.

### Basic Syntax

```sql
SELECT columns
FROM table
ORDER BY column [ASC | DESC]
```

### Examples

#### Single Column Sorting

```sql
-- Sort by name in ascending order (default)
SELECT *
FROM users
ORDER BY name

-- Sort by age in descending order
SELECT *
FROM users
ORDER BY age DESC

-- Sort by price in ascending order (explicit)
SELECT *
FROM products
ORDER BY price ASC
```

#### Multiple Column Sorting

```sql
-- Sort by category first, then by price within each category
SELECT *
FROM products
ORDER BY category ASC, price DESC

-- Sort by multiple criteria
SELECT *
FROM employees
ORDER BY department ASC, salary DESC, name ASC

-- Sort by column positions (1-based indexing)
SELECT id, name, price
FROM products
ORDER BY 1, 3 DESC

-- Mix column names and positions
SELECT id, name, price
FROM products
ORDER BY name ASC, 3 DESC
```

#### Combined with Other Clauses

```sql
-- WHERE + ORDER BY + LIMIT
SELECT *
FROM products
WHERE price > 100
ORDER BY price ASC
LIMIT 10

-- JOIN + ORDER BY
SELECT *
FROM users u
         JOIN orders o ON u.id = o.user_id
ORDER BY o.date DESC

-- Wildcard + ORDER BY
SELECT *
FROM audios.*
ORDER BY id ASC
```

### Sorting Behavior

- **Text**: Alphabetical sorting using locale-aware comparison
- **Numbers**: Numeric sorting (automatic type detection)
- **Mixed Types**: Converted to strings for comparison
- **NULL/Undefined**: Treated as empty strings and sorted first
- **Default Direction**: ASC (ascending) when not specified

### Integration with Other Features

ORDER BY works seamlessly with all other SQL features:

- Wildcard navigation (`SELECT * FROM audios.* ORDER BY name`)
- WHERE clauses (`SELECT * FROM table WHERE id > 1 ORDER BY name`)
- LIMIT (`SELECT * FROM table ORDER BY date DESC LIMIT 5`)
- JOINs (`SELECT * FROM t1 JOIN t2 ON t1.id = t2.id ORDER BY t1.name`)
- CTEs (`WITH temp AS (...) SELECT * FROM temp ORDER BY field`)
- UNION (`SELECT * FROM t1 UNION SELECT * FROM t2 ORDER BY name`)