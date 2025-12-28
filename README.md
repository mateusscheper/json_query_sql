# JSON Query SQL

Um sistema que permite executar queries SQL em estruturas JSON, incluindo suporte a wildcards (*) para navegar pelos níveis do JSON.

## Funcionalidades

### Queries SQL Básicas
- `SELECT * FROM tabela` - Seleciona todos os registros de uma tabela
- `SELECT coluna1, coluna2 FROM tabela` - Seleciona colunas específicas
- `SELECT coluna, * FROM tabela` - Seleciona coluna específica primeiro, depois todas as outras
- `SELECT * FROM tabela WHERE condição` - Filtra registros com condições
- `SELECT COUNT(*) FROM tabela` - Conta registros
- Suporte a operadores: `=`, `!=`, `<>`, `>`, `<`, `LIKE`, `ILIKE`
- Suporte a `LIMIT` para limitar resultados
- Suporte a `UNION` e `UNION ALL` para combinar resultados

### Wildcards (*) para Navegação em Níveis

O sistema suporta wildcards (*) para navegar pelos níveis do JSON:

#### Exemplos com a estrutura:
```json
{
  "audios": {
    "Reactions": [...],
    "Sound Effects": [...],
    "Whatsapp Audios": [...],
    "Television": [...],
    "Music": [...],
    "Sports": [...],
    "Games": [...],
    "Memes": [...],
    "Anime": [...]
  }
}
```

#### Queries com Wildcards:

- **`SELECT * FROM *`**
  - Retorna o conteúdo de todas as tabelas de primeiro nível
  - Para cada `*`, busca um nível dentro do JSON

- **`SELECT * FROM audios.*`**
  - Retorna todos os registros das subtabelas de "audios"
  - Combina dados de Reactions, Sound Effects, Whatsapp Audios, etc.

- **`SELECT * FROM *.*`**
  - Retorna todos os registros de todas as tabelas e suas subtabelas
  - Navega dois níveis de profundidade

- **`SELECT * FROM *.*.*`**
  - Retorna todos os registros navegando três níveis de profundidade
  - Para cada `*` adicional, desce mais um nível na estrutura JSON

#### Filtragem com Wildcards:

- **`SELECT * FROM audios.* WHERE id = 1`**
  - Filtra registros com `id = 1` de todas as subtabelas de "audios"

- **`SELECT COUNT(*) FROM audios.*`**
  - Conta todos os registros das subtabelas de "audios"

### UNION e UNION ALL

O sistema suporta combinação de resultados de múltiplas queries:

#### UNION
- **`SELECT * FROM tabela1 UNION SELECT * FROM tabela2`**
  - Combina resultados de duas queries
  - Remove registros duplicados automaticamente
  - Retorna apenas registros únicos

#### UNION ALL
- **`SELECT * FROM tabela1 UNION ALL SELECT * FROM tabela2`**
  - Combina resultados de duas queries
  - Mantém todos os registros, incluindo duplicatas
  - Mais rápido que UNION pois não verifica duplicatas

#### Exemplos com UNION:

```sql
-- Combinar músicas e esportes (sem duplicatas)
SELECT * FROM audios.Music UNION SELECT * FROM audios.Sports

-- Combinar apenas IDs (remove duplicatas)
SELECT id FROM audios.Music UNION SELECT id FROM audios.Sports

-- Combinar com filtros
SELECT * FROM audios.Music WHERE id = 1 UNION SELECT * FROM audios.Sports WHERE id = 1

-- Manter todas as entradas (com duplicatas)
SELECT id FROM audios.Music UNION ALL SELECT id FROM audios.Sports
```

### Características do UNION:

1. **Compatibilidade de Colunas**: As queries devem retornar colunas compatíveis
2. **Remoção de Duplicatas**: UNION remove duplicatas, UNION ALL mantém
3. **Performance**: UNION ALL é mais rápido por não verificar duplicatas
4. **Combinação com WHERE**: Funciona com cláusulas WHERE em ambas as queries

### Características dos Wildcards:

1. **Navegação por Níveis**: Cada `*` representa um nível de profundidade no JSON
2. **Dados Heterogêneos**: Combina automaticamente dados de diferentes estruturas
3. **Colunas Dinâmicas**: Detecta todas as colunas possíveis dos dados combinados
4. **Filtragem Flexível**: Aplica filtros WHERE em todos os dados combinados

## Estrutura do Projeto

```
src/
├── utils/
│   ├── sql.utils.js     # Lógica principal de queries SQL
│   ├── json.utils.js    # Utilitários para manipulação JSON
│   ├── cache.js         # Sistema de cache
│   └── debug.utils.js   # Utilitários de debug
├── App.vue              # Componente principal
└── main.js              # Ponto de entrada

test/
└── sql.utils.test.js    # Testes unitários
```

## Como Usar

1. Carregue seus dados JSON
2. Execute queries SQL usando a sintaxe suportada
3. Use wildcards (*) para navegar pelos níveis do JSON
4. Aplique filtros e agregações conforme necessário

## Exemplos Práticos

```sql
-- Buscar todos os dados
SELECT * FROM *

-- Buscar em uma categoria específica
SELECT * FROM audios.Music

-- Buscar em todas as subcategorias
SELECT * FROM audios.*

-- Filtrar por critério específico
SELECT * FROM audios.* WHERE id = 1

-- Contar registros
SELECT COUNT(*) FROM audios.*

-- Navegar múltiplos níveis
SELECT * FROM *.*.*

-- Selecionar coluna específica primeiro
SELECT id, * FROM audios.Music

-- Combinar resultados sem duplicatas
SELECT * FROM audios.Music UNION SELECT * FROM audios.Sports

-- Combinar resultados mantendo duplicatas
SELECT id FROM audios.Music UNION ALL SELECT id FROM audios.Sports

-- UNION com filtros
SELECT * FROM audios.Music WHERE id = 1 UNION SELECT * FROM audios.Games WHERE id = 1
```