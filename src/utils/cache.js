import pako from 'pako'
import {debugLog} from "@/utils/debug.utils.js";

class JsonCache {
    constructor() {
        this.dbName = 'JsonQueryCache'
        this.version = 1
        this.storeName = 'jsonFiles'
        this.db = null
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version)

            request.onerror = () => reject(request.error)
            request.onsuccess = () => {
                this.db = request.result
                resolve()
            }

            request.onupgradeneeded = (event) => {
                const db = event.target.result
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName, {keyPath: 'id'})
                }
            }
        })
    }

    async save(data, fileName, fileSize) {
        if (!this.db) await this.init()

        const transaction = this.db.transaction([this.storeName], 'readwrite')
        const store = transaction.objectStore(this.storeName)

        let processedData = data
        let compressed = false

        if (fileSize > 1024 * 1024) {
            try {
                const jsonString = JSON.stringify(data)
                const compressed_data = pako.deflate(jsonString)
                processedData = Array.from(compressed_data)
                compressed = true
                debugLog(`Arquivo comprimido: ${fileSize} -> ${compressed_data.length} bytes`)
            } catch (error) {
                console.warn('Erro na compressão, salvando sem comprimir:', error)
            }
        }

        const cacheData = {
            id: 'current',
            jsonData: processedData,
            fileName,
            fileSize,
            compressed,
            timestamp: Date.now()
        }

        return new Promise((resolve, reject) => {
            const request = store.put(cacheData)
            request.onsuccess = () => resolve()
            request.onerror = () => reject(request.error)
        })
    }

    async load() {
        if (!this.db) await this.init()

        const transaction = this.db.transaction([this.storeName], 'readonly')
        const store = transaction.objectStore(this.storeName)

        return new Promise((resolve, reject) => {
            const request = store.get('current')
            request.onsuccess = () => {
                const result = request.result
                if (result && result.compressed) {
                    try {
                        const compressedArray = new Uint8Array(result.jsonData)
                        const decompressed = pako.inflate(compressedArray, {to: 'string'})
                        result.jsonData = JSON.parse(decompressed)
                        debugLog('Arquivo descomprimido com sucesso')
                    } catch (error) {
                        console.error('Erro na descompressão:', error)
                        reject(error)
                        return
                    }
                }
                resolve(result)
            }
            request.onerror = () => reject(request.error)
        })
    }

    async clear() {
        if (!this.db) await this.init()

        const transaction = this.db.transaction([this.storeName], 'readwrite')
        const store = transaction.objectStore(this.storeName)

        return new Promise((resolve, reject) => {
            const request = store.delete('current')
            request.onsuccess = () => resolve()
            request.onerror = () => reject(request.error)
        })
    }
}

export const jsonCache = new JsonCache()