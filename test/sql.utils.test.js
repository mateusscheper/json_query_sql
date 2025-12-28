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
            {audioId: 1, reaction: "like", userId: 101, title: "Song 1"},
            {audioId: 2, reaction: "dislike", userId: 102, title: "Song 2"},
            {audioId: 1, reaction: "love", userId: 103, title: "Song 1"}
        ],
        "Sound Effects": [
            {id: 1, name: "Explosion", duration: 3},
            {id: 2, name: "Rain", duration: 10}
        ],
        "Whatsapp Audios": [
            {id: 1, message: "Hello", sender: "John"},
            {id: 2, message: "World", sender: "Jane"}
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
            {id: 1, game: "FIFA", platform: "PS5"},
            {id: 2, game: "COD", platform: "Xbox"}
        ],
        Memes: [
            {id: 1, meme: "Distracted Boyfriend", likes: 1000},
            {id: 2, meme: "Drake Pointing", likes: 800}
        ],
        Anime: [
            {id: 1, title: "Naruto", episodes: 720},
            {id: 2, title: "One Piece", episodes: 1000}
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
        {audioId: 1, reaction: "like", userId: 101, title: "Song 1"},
        {audioId: 2, reaction: "dislike", userId: 102, title: "Song 2"},
        {audioId: 1, reaction: "love", userId: 103, title: "Song 1"}
    ];
    assertEquals(result.results, expected, 'Query: SELECT * FROM audios.Reactions');
});

test('SELECT * FROM audios.Reactions WHERE title = Song 1', () => {
    const result = SqlUtils.executeSQL(testData, "SELECT * FROM audios.Reactions WHERE title = 'Song 1'");
    const expected = [
        {audioId: 1, reaction: "like", userId: 101, title: "Song 1"},
        {audioId: 1, reaction: "love", userId: 103, title: "Song 1"}
    ];
    assertEquals(result.results, expected, 'Query: WHERE title = Song 1');
});

test('SELECT * FROM audios.Reactions WHERE title LIKE Song 1', () => {
    const result = SqlUtils.executeSQL(testData, "SELECT * FROM audios.Reactions WHERE title LIKE 'Song 1'");
    const expected = [
        {audioId: 1, reaction: "like", userId: 101, title: "Song 1"},
        {audioId: 1, reaction: "love", userId: 103, title: "Song 1"}
    ];
    assertEquals(result.results, expected, 'Query: WHERE title LIKE Song 1');
});

test('SELECT * FROM audios.Reactions WHERE title LIKE %ong 1%', () => {
    const result = SqlUtils.executeSQL(testData, "SELECT * FROM audios.Reactions WHERE title LIKE '%ong 1%'");
    const expected = [
        {audioId: 1, reaction: "like", userId: 101, title: "Song 1"},
        {audioId: 1, reaction: "love", userId: 103, title: "Song 1"}
    ];
    assertEquals(result.results, expected, 'Query: WHERE title LIKE %ong 1%');
});

test('SELECT * FROM audios.Reactions WHERE title LIKE S%ng 1', () => {
    const result = SqlUtils.executeSQL(testData, "SELECT * FROM audios.Reactions WHERE title LIKE 'S%ng 1'");
    const expected = [
        {audioId: 1, reaction: "like", userId: 101, title: "Song 1"},
        {audioId: 1, reaction: "love", userId: 103, title: "Song 1"}
    ];
    assertEquals(result.results, expected, 'Query: WHERE title LIKE S%ng 1');
});

test('SELECT * FROM audios.Reactions WHERE title ILIKE Song 1', () => {
    const result = SqlUtils.executeSQL(testData, "SELECT * FROM audios.Reactions WHERE title ILIKE 'Song 1'");
    const expected = [
        {audioId: 1, reaction: "like", userId: 101, title: "Song 1"},
        {audioId: 1, reaction: "love", userId: 103, title: "Song 1"}
    ];
    assertEquals(result.results, expected, 'Query: WHERE title ILIKE Song 1');
});

test('SELECT * FROM audios.Reactions WHERE title ILIKE %song 1', () => {
    const result = SqlUtils.executeSQL(testData, "SELECT * FROM audios.Reactions WHERE title ILIKE '%song 1'");
    const expected = [
        {audioId: 1, reaction: "like", userId: 101, title: "Song 1"},
        {audioId: 1, reaction: "love", userId: 103, title: "Song 1"}
    ];
    assertEquals(result.results, expected, 'Query: WHERE title ILIKE %song 1');
});

test('SELECT * FROM audios.Reactions WHERE title ILIKE %ong 1', () => {
    const result = SqlUtils.executeSQL(testData, "SELECT * FROM audios.Reactions WHERE title ILIKE '%ong 1'");
    const expected = [
        {audioId: 1, reaction: "like", userId: 101, title: "Song 1"},
        {audioId: 1, reaction: "love", userId: 103, title: "Song 1"}
    ];
    assertEquals(result.results, expected, 'Query: WHERE title ILIKE %ong 1');
});

test('SELECT * FROM audios.Reactions WHERE title != Song 1', () => {
    const result = SqlUtils.executeSQL(testData, "SELECT * FROM audios.Reactions WHERE title != 'Song 1'");
    const expected = [
        {audioId: 2, reaction: "dislike", userId: 102, title: "Song 2"}
    ];
    assertEquals(result.results, expected, 'Query: WHERE title != Song 1');
});

test('SELECT * FROM audios.Reactions WHERE title = No Song', () => {
    const result = SqlUtils.executeSQL(testData, "SELECT * FROM audios.Reactions WHERE title = 'No Song'");
    const expected = [];
    assertEquals(result.results, expected, 'Query: WHERE title = No Song');
});

test('SELECT * FROM audios.Reactions WHERE title != No Song', () => {
    const result = SqlUtils.executeSQL(testData, "SELECT * FROM audios.Reactions WHERE title != 'No Song'");
    const expected = [
        {audioId: 1, reaction: "like", userId: 101, title: "Song 1"},
        {audioId: 2, reaction: "dislike", userId: 102, title: "Song 2"},
        {audioId: 1, reaction: "love", userId: 103, title: "Song 1"}
    ];
    assertEquals(result.results, expected, 'Query: WHERE title != No Song');
});

test('SELECT * FROM audios.Reactions WHERE title ILIKE No Song', () => {
    const result = SqlUtils.executeSQL(testData, "SELECT * FROM audios.Reactions WHERE title ILIKE 'No Song'");
    const expected = [];
    assertEquals(result.results, expected, 'Query: WHERE title ILIKE No Song');
});

test('SELECT * FROM audios.Reactions WHERE title LIKE No Song', () => {
    const result = SqlUtils.executeSQL(testData, "SELECT * FROM audios.Reactions WHERE title LIKE 'No Song'");
    const expected = [];
    assertEquals(result.results, expected, 'Query: WHERE title LIKE No Song');
});

test('SELECT * FROM audios."Whatsapp Audios" - deve funcionar com nomes que contêm espaços', () => {
    const result = SqlUtils.executeSQL(testData, 'SELECT * FROM audios."Whatsapp Audios"');
    const expected = [
        {id: 1, message: "Hello", sender: "John"},
        {id: 2, message: "World", sender: "Jane"}
    ];
    assertEquals(result.results, expected, 'Query: SELECT * FROM audios."Whatsapp Audios"');
});

test('SELECT id, * FROM audios."Whatsapp Audios" - deve retornar id primeiro e depois outras colunas', () => {
    const result = SqlUtils.executeSQL(testData, 'SELECT id, * FROM audios."Whatsapp Audios"');
    const expected = [
        {id: 1, message: "Hello", sender: "John"},
        {id: 2, message: "World", sender: "Jane"}
    ];
    assertEquals(result.results, expected, 'Query: SELECT id, * FROM audios."Whatsapp Audios"');

    // Verifica se a ordem das colunas está correta (id primeiro)
    if (result.results.length > 0) {
        const keys = Object.keys(result.results[0]);
        if (keys[0] !== 'id') {
            throw new Error(`Primeira coluna deveria ser 'id', mas é '${keys[0]}'. Ordem: ${keys.join(', ')}`);
        }
    }
});

test('SELECT sender, id, * FROM audios."Whatsapp Audios" - deve retornar sender, id e depois outras colunas', () => {
    const result = SqlUtils.executeSQL(testData, 'SELECT sender, id, * FROM audios."Whatsapp Audios"');
    const expected = [
        {sender: "John", id: 1, message: "Hello"},
        {sender: "Jane", id: 2, message: "World"}
    ];
    assertEquals(result.results, expected, 'Query: SELECT sender, id, * FROM audios."Whatsapp Audios"');

    // Verifica se a ordem das colunas está correta
    if (result.results.length > 0) {
        const keys = Object.keys(result.results[0]);
        if (keys[0] !== 'sender' || keys[1] !== 'id') {
            throw new Error(`Ordem incorreta. Esperado: sender, id, message. Atual: ${keys.join(', ')}`);
        }
    }
});

// Testes de wildcards
debugLog('\nExecutando testes de wildcards...');

test('SELECT * FROM * - deve retornar todo o conteúdo de audios (tabela raiz)', () => {
    const result = SqlUtils.executeSQL(testData, 'SELECT * FROM *');
    // Para "*" na raiz, deve retornar: audio (2) + todos de audios (19) = 21 registros
    const expectedCount = 21;
    assertEquals(result.results.length, expectedCount, 'Query: SELECT * FROM *');
});

test('SELECT * FROM audios.* - deve retornar todos os registros das subtabelas de audios', () => {
    const result = SqlUtils.executeSQL(testData, 'SELECT * FROM audios.*');
    // Deve retornar todos os registros de todas as subtabelas de audios: 3+2+2+2+2+2+2+2+2 = 19 registros
    const expectedCount = 19;
    assertEquals(result.results.length, expectedCount, 'Query: SELECT * FROM audios.*');
});

test('SELECT * FROM *.* - deve retornar todos os registros de todas as tabelas e subtabelas', () => {
    const result = SqlUtils.executeSQL(testData, 'SELECT * FROM *.*');
    // Deve incluir todas as subtabelas: audio não tem sub-arrays + audios.* (19) = 19 registros
    const expectedCount = 19;
    assertEquals(result.results.length, expectedCount, 'Query: SELECT * FROM *.*');
});

test('SELECT COUNT(*) FROM audios.* - deve contar todos os registros das subtabelas', () => {
    const result = SqlUtils.executeSQL(testData, 'SELECT COUNT(*) FROM audios.*');
    assertEquals(result.results[0]['COUNT(*)'], 19, 'Query: SELECT COUNT(*) FROM audios.*');
});

test('SELECT * FROM audios.* WHERE id = 1 - deve filtrar registros com id = 1 de todas as subtabelas', () => {
    const result = SqlUtils.executeSQL(testData, "SELECT * FROM audios.* WHERE id = 1");
    // Deve retornar registros com id = 1 de todas as subtabelas que têm esse campo
    // Sound Effects, Whatsapp Audios, Television, Music, Sports, Games, Memes, Anime = 8 registros
    const expectedCount = 8;
    assertEquals(result.results.length, expectedCount, 'Query: SELECT * FROM audios.* WHERE id = 1');
});

// Testes de UNION
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

test('SELECT * FROM audios.Music UNION ALL SELECT * FROM audios.Sports - deve combinar com duplicatas', () => {
    const result = SqlUtils.executeSQL(testData, 'SELECT * FROM audios.Music UNION ALL SELECT * FROM audios.Sports');
    const expected = [
        {id: 1, artist: "Beatles", song: "Yesterday"},
        {id: 2, artist: "Queen", song: "Bohemian Rhapsody"},
        {id: 1, sport: "Football", team: "Barcelona"},
        {id: 2, sport: "Basketball", team: "Lakers"}
    ];
    assertEquals(result.results, expected, 'Query: UNION ALL');
});

test('SELECT id FROM audios.Music UNION SELECT id FROM audios.Sports - deve remover duplicatas', () => {
    const result = SqlUtils.executeSQL(testData, 'SELECT id FROM audios.Music UNION SELECT id FROM audios.Sports');
    const expected = [
        {id: 1},
        {id: 2}
    ];
    assertEquals(result.results, expected, 'Query: UNION com duplicatas removidas');
});

test('SELECT id FROM audios.Music UNION ALL SELECT id FROM audios.Sports - deve manter duplicatas', () => {
    const result = SqlUtils.executeSQL(testData, 'SELECT id FROM audios.Music UNION ALL SELECT id FROM audios.Sports');
    const expected = [
        {id: 1},
        {id: 2},
        {id: 1},
        {id: 2}
    ];
    assertEquals(result.results, expected, 'Query: UNION ALL com duplicatas mantidas');
});

test('SELECT * FROM audios."Whatsapp Audios" WHERE id = 1 UNION SELECT * FROM audios.Music WHERE id = 1', () => {
    const result = SqlUtils.executeSQL(testData, 'SELECT * FROM audios."Whatsapp Audios" WHERE id = 1 UNION SELECT * FROM audios.Music WHERE id = 1');
    const expected = [
        {id: 1, message: "Hello", sender: "John"},
        {id: 1, artist: "Beatles", song: "Yesterday"}
    ];
    assertEquals(result.results, expected, 'Query: UNION com WHERE clauses');
});

debugLog('\nTodos os testes concluídos!');