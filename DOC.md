# SQL Features Documentation

This system supports a comprehensive set of SQL operations for querying JSON data. Each feature includes wildcard support, filtering capabilities, and integration with other SQL operations.

| Feature                      | Description                                   | Example                                                                                |
|------------------------------|-----------------------------------------------|----------------------------------------------------------------------------------------|
| **Basic SELECT**             | Select all or specific columns from tables    | `SELECT * FROM table`                                                                  |
| **Column Selection**         | Choose specific columns or mix with wildcard  | `SELECT id, name FROM table`                                                           |
| **WHERE Filtering**          | Filter records with various operators         | `SELECT * FROM table WHERE id = 1`                                                     |
| **LIKE/ILIKE**               | Pattern matching (case sensitive/insensitive) | `SELECT * FROM table WHERE name LIKE '%test%'`                                         |
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
| **OUTER JOIN**               | Full outer join (alias for FULL OUTER JOIN)  | `SELECT * FROM table1 t1 OUTER JOIN table2 t2 ON t1.id = t2.id`                        |
| **FULL OUTER JOIN**          | Full outer join with null padding             | `SELECT * FROM table1 t1 FULL OUTER JOIN table2 t2 ON t1.id = t2.id`                   |
| **Complex WHERE**            | Multiple conditions with AND/OR               | `SELECT * FROM table WHERE id > 1 AND name LIKE '%test%'`                              |
| **Quoted Table Names**       | Tables with spaces or special chars           | `SELECT * FROM "Table Name" WHERE field = 'value'`                                     |
| **Nested JSON Paths**        | Access nested object properties               | `SELECT * FROM parent.child.grandchild`                                                |
| **Mixed Queries**            | Combine multiple features                     | `WITH filtered AS (SELECT * FROM audios.* WHERE id > 1) SELECT COUNT(*) FROM filtered` |