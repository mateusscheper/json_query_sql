import {SqlUtils} from '../src/utils/sql.utils.js';
import {debugLog} from "@/utils/debug.utils.js";

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
        "Whatsapp Audios": [
            {id: 1, message: "Hello", sender: "John"},
            {id: 2, message: "World", sender: "Jane"}
        ]
    }
};

function test(description, testFn) {
    try {
        testFn();
        debugLog(`✓ ${description}`);
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

debugLog('\nTodos os testes concluídos!');