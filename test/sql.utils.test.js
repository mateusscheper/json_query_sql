import {SqlUtils} from '../src/utils/sql.utils.js';
import {debugLog} from "../src/utils/debug.utils.js";

if (typeof process !== 'undefined' && process.env) {
    process.env.DEBUG = 'false';
} else if (typeof import.meta !== 'undefined' && import.meta.env) {
    import.meta.env.VITE_DEBUG = 'false';
}

const testData = {
    audio: [
        {id: 1, title: "Song 1", duration: 180},
        {id: 2, title: "Song 2", duration: 240}
    ],
    audios: {
        Reactions: [
            {id: 1, type: "like", user: "Alice"},
            {id: 2, type: "love", user: "Bob"},
            {id: 3, type: "laugh", user: "Charlie"}
        ],
        "Sound Effects": [
            {id: 1, name: "Explosion", duration: 3},
            {id: 2, name: "Rain", duration: 10}
        ],
        "Whatsapp Audios": [
            {id: 1, message: "Hello", sender: "John"},
            {id: 2, message: "Hi there", sender: "Jane"}
        ],
        Television: [
            {id: 1, show: "News", channel: "CNN"},
            {id: 2, show: "Comedy", channel: "HBO"}
        ],
        Music: [
            {id: 1, artist: "Beatles", song: "Yesterday"},
            {id: 2, artist: "Queen", song: "Bohemian Rhapsody"}
        ],
        Sports: [
            {id: 1, sport: "Football", team: "Barcelona"},
            {id: 2, sport: "Basketball", team: "Lakers"}
        ],
        Games: [
            {id: 1, name: "FIFA", platform: "PC"},
            {id: 2, name: "Call of Duty", platform: "Console"}
        ],
        Memes: [
            {id: 1, meme: "Distracted Boyfriend", likes: 1000},
            {id: 2, meme: "Drake Pointing", likes: 800}
        ],
        Anime: [
            {id: 1, name: "Naruto", genre: "Action"},
            {id: 2, name: "One Piece", genre: "Adventure"}
        ]
    }
};

function test(description, testFn) {
    try {
        testFn();
        console.log(`✓ ${description}`);
    } catch (error) {
        console.error(`✗ ${description}: ${error.message}`);
    }
}

function assertEquals(actual, expected, message = '') {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`${message} - Expected: ${JSON.stringify(expected)}, Actual: ${JSON.stringify(actual)}`);
    }
}

debugLog('Executando testes do SqlUtils...\n');

test('SELECT * FROM audio - deve retornar todos os registros de audio', () => {
    const result = SqlUtils.executeSQL(testData, 'SELECT * FROM audio');
    const expected = [
        {id: 1, title: "Song 1", duration: 180},
        {id: 2, title: "Song 2", duration: 240}
    ];
    assertEquals(result.results, expected, 'Query: SELECT * FROM audio');
});

test('SELECT * FROM audios.Reactions - deve retornar todos os registros de Reactions', () => {
    const result = SqlUtils.executeSQL(testData, 'SELECT * FROM audios.Reactions');
    const expected = [
        {id: 1, type: "like", user: "Alice"},
        {id: 2, type: "love", user: "Bob"},
        {id: 3, type: "laugh", user: "Charlie"}
    ];
    assertEquals(result.results, expected, 'Query: SELECT * FROM audios.Reactions');
});

test('SELECT * FROM audios."Whatsapp Audios" - deve funcionar com nomes que contêm espaços', () => {
    const result = SqlUtils.executeSQL(testData, 'SELECT * FROM audios."Whatsapp Audios"');
    const expected = [
        {id: 1, message: "Hello", sender: "John"},
        {id: 2, message: "Hi there", sender: "Jane"}
    ];
    assertEquals(result.results, expected, 'Query: SELECT * FROM audios."Whatsapp Audios"');
});

test('SELECT * FROM audios.Reactions WHERE type = like', () => {
    const result = SqlUtils.executeSQL(testData, "SELECT * FROM audios.Reactions WHERE type = 'like'");
    const expected = [
        {id: 1, type: "like", user: "Alice"}
    ];
    assertEquals(result.results, expected, 'Query: WHERE type = like');
});

test('SELECT * FROM audios.Reactions WHERE type LIKE %ov%', () => {
    const result = SqlUtils.executeSQL(testData, "SELECT * FROM audios.Reactions WHERE type LIKE '%ov%'");
    const expected = [
        {id: 2, type: "love", user: "Bob"}
    ];
    assertEquals(result.results, expected, 'Query: WHERE type LIKE %ov%');
});

test('SELECT * FROM audios.Reactions WHERE type ILIKE %AUG%', () => {
    const result = SqlUtils.executeSQL(testData, "SELECT * FROM audios.Reactions WHERE type ILIKE '%AUG%'");
    const expected = [
        {id: 3, type: "laugh", user: "Charlie"}
    ];
    assertEquals(result.results, expected, 'Query: WHERE type ILIKE %AUG%');
});

debugLog('\nExecutando testes de wildcards...');

test('SELECT * FROM * - deve retornar todo o conteúdo de audios (tabela raiz)', () => {
    const result = SqlUtils.executeSQL(testData, 'SELECT * FROM *');
    const expectedCount = 21;
    assertEquals(result.results.length, expectedCount, 'Query: SELECT * FROM *');
});

test('SELECT * FROM audios.* - deve retornar todos os registros das subtabelas de audios', () => {
    const result = SqlUtils.executeSQL(testData, 'SELECT * FROM audios.*');
    const expectedCount = 19;
    assertEquals(result.results.length, expectedCount, 'Query: SELECT * FROM audios.*');
});

test('SELECT COUNT(*) FROM audios.* - deve contar todos os registros das subtabelas', () => {
    const result = SqlUtils.executeSQL(testData, 'SELECT COUNT(*) FROM audios.*');
    assertEquals(result.results[0]['COUNT(*)'], 19, 'Query: SELECT COUNT(*) FROM audios.*');
});

debugLog('\nExecutando testes de UNION...');

test('SELECT * FROM audios.Music UNION SELECT * FROM audios.Sports - deve combinar sem duplicatas', () => {
    const result = SqlUtils.executeSQL(testData, 'SELECT * FROM audios.Music UNION SELECT * FROM audios.Sports');
    const expected = [
        {id: 1, artist: "Beatles", song: "Yesterday"},
        {id: 2, artist: "Queen", song: "Bohemian Rhapsody"},
        {id: 1, sport: "Football", team: "Barcelona"},
        {id: 2, sport: "Basketball", team: "Lakers"}
    ];
    assertEquals(result.results, expected, 'Query: UNION');
});

test('SELECT id FROM audios.Music UNION SELECT id FROM audios.Sports - deve remover duplicatas', () => {
    const result = SqlUtils.executeSQL(testData, 'SELECT id FROM audios.Music UNION SELECT id FROM audios.Sports');
    const expected = [
        {id: 1},
        {id: 2}
    ];
    assertEquals(result.results, expected, 'Query: UNION com duplicatas removidas');
});

debugLog('\nExecutando testes de WITH (CTEs)...');

test('WITH music_cte AS (SELECT * FROM audios.Music) SELECT * FROM music_cte', () => {
    const result = SqlUtils.executeSQL(testData, 'WITH music_cte AS (SELECT * FROM audios.Music) SELECT * FROM music_cte');
    const expected = [
        {id: 1, artist: "Beatles", song: "Yesterday"},
        {id: 2, artist: "Queen", song: "Bohemian Rhapsody"}
    ];
    assertEquals(result.results, expected, 'Query: WITH simples');
});

test('WITH filtered_music AS (SELECT * FROM audios.Music WHERE id = 1) SELECT * FROM filtered_music', () => {
    const result = SqlUtils.executeSQL(testData, 'WITH filtered_music AS (SELECT * FROM audios.Music WHERE id = 1) SELECT * FROM filtered_music');
    const expected = [
        {id: 1, artist: "Beatles", song: "Yesterday"}
    ];
    assertEquals(result.results, expected, 'Query: WITH com WHERE');
});

debugLog('\nExecutando testes de JOIN...');

test('SELECT * FROM audios.Music m JOIN audios.Sports s ON m.id = s.id - deve fazer INNER JOIN', () => {
    const result = SqlUtils.executeSQL(testData, 'SELECT * FROM audios.Music m JOIN audios.Sports s ON m.id = s.id');
    const expected = [
        {id: 1, artist: "Beatles", song: "Yesterday", s_id: 1, s_sport: "Football", s_team: "Barcelona"},
        {id: 2, artist: "Queen", song: "Bohemian Rhapsody", s_id: 2, s_sport: "Basketball", s_team: "Lakers"}
    ];
    assertEquals(result.results, expected, 'Query: INNER JOIN');
});

test('SELECT * FROM audios."Whatsapp Audios" w_audios JOIN audios.Reactions reactions ON w_audios.id = reactions.id', () => {
    const result = SqlUtils.executeSQL(testData, 'SELECT * FROM audios."Whatsapp Audios" w_audios JOIN audios.Reactions reactions ON w_audios.id = reactions.id');
    const expected = [
        {id: 1, message: "Hello", sender: "John", reactions_id: 1, reactions_type: "like", reactions_user: "Alice"},
        {id: 2, message: "Hi there", sender: "Jane", reactions_id: 2, reactions_type: "love", reactions_user: "Bob"}
    ];
    assertEquals(result.results, expected, 'Query: JOIN com tabelas com aspas');
});

debugLog('\nExecutando testes de Alias de Tabelas...');

test('SELECT * FROM audios.Music AS m WHERE m.id = 1 - deve usar alias com AS', () => {
    const result = SqlUtils.executeSQL(testData, 'SELECT * FROM audios.Music AS m WHERE m.id = 1');
    const expected = [
        {id: 1, artist: "Beatles", song: "Yesterday"}
    ];
    assertEquals(result.results, expected, 'Query: Alias com AS');
});

test('SELECT * FROM audios.Music m WHERE m.artist = "Beatles" - deve usar alias sem AS', () => {
    const result = SqlUtils.executeSQL(testData, 'SELECT * FROM audios.Music m WHERE m.artist = "Beatles"');
    const expected = [
        {id: 1, artist: "Beatles", song: "Yesterday"}
    ];
    assertEquals(result.results, expected, 'Query: Alias sem AS');
});

test('SELECT * FROM audios."Whatsapp Audios" AS wa WHERE wa.sender = "John" - deve usar alias com nome complexo', () => {
    const result = SqlUtils.executeSQL(testData, 'SELECT * FROM audios."Whatsapp Audios" AS wa WHERE wa.sender = "John"');
    const expected = [
        {id: 1, message: "Hello", sender: "John"}
    ];
    assertEquals(result.results, expected, 'Query: Alias com nome de tabela complexo');
});

debugLog('\nExecutando testes de ORDER BY...');

test('SELECT * FROM audios.Music ORDER BY artist ASC - deve ordenar por artista crescente', () => {
    const result = SqlUtils.executeSQL(testData, 'SELECT * FROM audios.Music ORDER BY artist ASC');
    const expected = [
        {id: 1, artist: "Beatles", song: "Yesterday"},
        {id: 2, artist: "Queen", song: "Bohemian Rhapsody"}
    ];
    assertEquals(result.results, expected, 'Query: ORDER BY ASC');
});

test('SELECT * FROM audios.Music ORDER BY artist DESC - deve ordenar por artista decrescente', () => {
    const result = SqlUtils.executeSQL(testData, 'SELECT * FROM audios.Music ORDER BY artist DESC');
    const expected = [
        {id: 2, artist: "Queen", song: "Bohemian Rhapsody"},
        {id: 1, artist: "Beatles", song: "Yesterday"}
    ];
    assertEquals(result.results, expected, 'Query: ORDER BY DESC');
});

test('SELECT * FROM audios.Music ORDER BY artist - deve ordenar crescente por padrão', () => {
    const result = SqlUtils.executeSQL(testData, 'SELECT * FROM audios.Music ORDER BY artist');
    const expected = [
        {id: 1, artist: "Beatles", song: "Yesterday"},
        {id: 2, artist: "Queen", song: "Bohemian Rhapsody"}
    ];
    assertEquals(result.results, expected, 'Query: ORDER BY sem direção');
});

test('SELECT * FROM audio ORDER BY duration DESC, id ASC - deve ordenar por múltiplas colunas', () => {
    const result = SqlUtils.executeSQL(testData, 'SELECT * FROM audio ORDER BY duration DESC, id ASC');
    const expected = [
        {id: 2, title: "Song 2", duration: 240},
        {id: 1, title: "Song 1", duration: 180}
    ];
    assertEquals(result.results, expected, 'Query: ORDER BY múltiplas colunas');
});

test('SELECT * FROM audios.Memes ORDER BY likes DESC - deve ordenar números corretamente', () => {
    const result = SqlUtils.executeSQL(testData, 'SELECT * FROM audios.Memes ORDER BY likes DESC');
    const expected = [
        {id: 1, meme: "Distracted Boyfriend", likes: 1000},
        {id: 2, meme: "Drake Pointing", likes: 800}
    ];
    assertEquals(result.results, expected, 'Query: ORDER BY numérico');
});

test('SELECT * FROM audios.Music WHERE id > 0 ORDER BY song ASC LIMIT 1 - deve combinar WHERE, ORDER BY e LIMIT', () => {
    const result = SqlUtils.executeSQL(testData, 'SELECT * FROM audios.Music WHERE id > 0 ORDER BY song ASC LIMIT 1');
    const expected = [
        {id: 2, artist: "Queen", song: "Bohemian Rhapsody"}
    ];
    assertEquals(result.results, expected, 'Query: WHERE + ORDER BY + LIMIT');
});

test('SELECT * FROM audio ORDER BY 2 DESC - deve ordenar por posição da coluna', () => {
    const result = SqlUtils.executeSQL(testData, 'SELECT * FROM audio ORDER BY 2 DESC');
    const expected = [
        {id: 2, title: "Song 2", duration: 240},
        {id: 1, title: "Song 1", duration: 180}
    ];
    assertEquals(result.results, expected, 'Query: ORDER BY posição');
});

test('SELECT id, title FROM audio ORDER BY 1, 2 DESC - deve ordenar por múltiplas posições', () => {
    const result = SqlUtils.executeSQL(testData, 'SELECT id, title FROM audio ORDER BY 1, 2 DESC');
    const expected = [
        {id: 1, title: "Song 1"},
        {id: 2, title: "Song 2"}
    ];
    assertEquals(result.results, expected, 'Query: ORDER BY múltiplas posições');
});

test('SELECT * FROM audio ORDER BY 3 ASC - deve ordenar por terceira coluna (duration)', () => {
    const result = SqlUtils.executeSQL(testData, 'SELECT * FROM audio ORDER BY 3 ASC');
    const expected = [
        {id: 1, title: "Song 1", duration: 180},
        {id: 2, title: "Song 2", duration: 240}
    ];
    assertEquals(result.results, expected, 'Query: ORDER BY terceira posição');
});

test('SELECT title, duration FROM audio ORDER BY 2 DESC, 1 ASC - deve ordenar por posição com múltiplas direções', () => {
    const result = SqlUtils.executeSQL(testData, 'SELECT title, duration FROM audio ORDER BY 2 DESC, 1 ASC');
    const expected = [
        {title: "Song 2", duration: 240},
        {title: "Song 1", duration: 180}
    ];
    assertEquals(result.results, expected, 'Query: ORDER BY posições com direções diferentes');
});

test('SELECT id, title, duration FROM audio ORDER BY 1 DESC - deve ordenar por primeira posição decrescente', () => {
    const result = SqlUtils.executeSQL(testData, 'SELECT id, title, duration FROM audio ORDER BY 1 DESC');
    const expected = [
        {id: 2, title: "Song 2", duration: 240},
        {id: 1, title: "Song 1", duration: 180}
    ];
    assertEquals(result.results, expected, 'Query: ORDER BY primeira posição DESC');
});

test('SELECT * FROM audios.Memes ORDER BY 3 ASC - deve ordenar por posição numérica crescente', () => {
    const result = SqlUtils.executeSQL(testData, 'SELECT * FROM audios.Memes ORDER BY 3 ASC');
    const expected = [
        {id: 2, meme: "Drake Pointing", likes: 800},
        {id: 1, meme: "Distracted Boyfriend", likes: 1000}
    ];
    assertEquals(result.results, expected, 'Query: ORDER BY posição numérica');
});

debugLog('\nTodos os testes concluídos!');

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {test, assertEquals};
}