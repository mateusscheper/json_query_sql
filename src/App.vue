<script setup lang="js">
import {computed, onMounted, ref} from 'vue'
import FileUpload from 'primevue/fileupload'
import Textarea from 'primevue/textarea'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Message from 'primevue/message'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Skeleton from 'primevue/skeleton'
import ConfirmDialog from 'primevue/confirmdialog'
import {useConfirm} from 'primevue/useconfirm'
import {JsonViewer} from 'vue3-json-viewer'
import {SqlUtils} from './utils/sql.utils.js'
import {JsonUtils} from './utils/json.utils.js'
import {jsonCache} from './utils/cache.js'

const jsonFile = ref(null)
const sqlQuery = ref('')
const queryResults = ref([])
const jsonData = ref(null)
const jsonDB = ref(null)
const columnNames = ref([])
const showJsonViewer = ref(false)
const jsonViewerDisabled = ref(false)
const forceEnableViewer = ref(false)
const fileSize = ref(0)
const isExecutingQuery = ref(false)
const queryLimited = ref(false)
const hasExplicitLimit = ref(false)
const totalResults = ref(0)
const isLoading = ref(true)
const queryHistory = ref([])
const topHeight = ref(45)
const hasExecutedQuery = ref(false)

const confirm = useConfirm()

let isDragging = false

const startResize = (event) => {
  isDragging = true
  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
  event.preventDefault()
}

const handleResize = (event) => {
  if (!isDragging) return
  const containerHeight = window.innerHeight - 40 // padding
  const newTopHeight = (event.clientY - 20) / containerHeight * 100
  if (newTopHeight >= 20 && newTopHeight <= 80) {
    topHeight.value = newTopHeight
  }
}

const stopResize = () => {
  isDragging = false
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
}

const jsonSummary = computed(() => {
  if (!jsonData.value) return null
  return JsonUtils.getJsonSummary(jsonData.value)
})

const saveToSession = async () => {
  if (jsonData.value) {
    try {
      if (fileSize.value < 2 * 1024 * 1024) {
        sessionStorage.setItem('jsonData', JSON.stringify(jsonData.value))
        sessionStorage.setItem('fileName', jsonFile.value?.name || 'uploaded.json')
        sessionStorage.setItem('fileSize', fileSize.value.toString())
      } else {
        await jsonCache.save(jsonData.value, jsonFile.value?.name || 'uploaded.json', fileSize.value)
      }
    } catch (error) {
      console.warn('Erro ao salvar no sessionStorage, usando IndexedDB:', error)
      await jsonCache.save(jsonData.value, jsonFile.value?.name || 'uploaded.json', fileSize.value)
    }
  }
}

const loadFromSession = async () => {
  const savedHistory = localStorage.getItem('queryHistory')
  if (savedHistory) {
    queryHistory.value = JSON.parse(savedHistory)
  }

  const savedData = sessionStorage.getItem('jsonData')
  if (savedData) {
    const savedFileName = sessionStorage.getItem('fileName')
    const savedFileSize = sessionStorage.getItem('fileSize')
    const originalData = JSON.parse(savedData)
    let processedData = originalData
    if (Array.isArray(originalData)) {
      processedData = {root: originalData}
    }
    jsonData.value = originalData
    jsonDB.value = processedData
    jsonFile.value = {name: savedFileName}
    fileSize.value = parseInt(savedFileSize) || 0
    jsonViewerDisabled.value = fileSize.value > 2 * 1024 * 1024
    return
  }

  try {
    const cacheData = await jsonCache.load()
    if (cacheData) {
      const originalData = cacheData.jsonData
      let processedData = originalData
      if (Array.isArray(originalData)) {
        processedData = {root: originalData}
      }
      jsonData.value = originalData
      jsonDB.value = processedData
      jsonFile.value = {name: cacheData.fileName}
      fileSize.value = cacheData.fileSize
      jsonViewerDisabled.value = fileSize.value > 2 * 1024 * 1024
    }
  } catch (error) {
    console.warn('Erro ao carregar do IndexedDB:', error)
  }
}

const onFileSelect = (event) => {
  const file = event.files[0]
  if (file && file.type === 'application/json' || file.name.toLowerCase().endsWith('.json')) {
    fileSize.value = file.size
    jsonViewerDisabled.value = file.size > 2 * 1024 * 1024
    forceEnableViewer.value = false

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        let data = JSON.parse(e.target.result)
        const originalData = data
        if (Array.isArray(data)) {
          data = {root: data}
        }
        jsonData.value = originalData
        jsonDB.value = data
        jsonFile.value = file
        saveToSession()
      } catch (error) {
        console.error('Erro ao parsear JSON:', error)
      }
    }
    reader.readAsText(file)
  }
}

const executeQuery = async () => {
  if (!jsonDB.value || !sqlQuery.value.trim()) return

  isExecutingQuery.value = true
  queryLimited.value = false
  totalResults.value = 0

  try {
    await new Promise(resolve => setTimeout(resolve, 100))

    const result = SqlUtils.executeSQL(jsonDB.value, sqlQuery.value)

    queryResults.value = result.results || []
    totalResults.value = result.totalResults || 0
    queryLimited.value = result.limited || false
    hasExplicitLimit.value = result.hasExplicitLimit || false
    hasExecutedQuery.value = true
    
    if (result.results && result.results.length > 0) {
      columnNames.value = Object.keys(result.results[0])
    } else {
      columnNames.value = extractColumnsFromQuery(sqlQuery.value.trim())
    }
    
    if (sqlQuery.value.trim()) {
      addToHistory(sqlQuery.value.trim())
    }
  } catch (error) {
    console.error('Erro ao executar query:', error)
    queryResults.value = []
    columnNames.value = []
    totalResults.value = 0
    queryLimited.value = false
    hasExplicitLimit.value = false
    hasExecutedQuery.value = true
  } finally {
    isExecutingQuery.value = false
  }
}

const extractColumnsFromQuery = (query) => {
  const selectMatch = query.match(/SELECT\s+(.+?)\s+FROM/i)
  if (selectMatch) {
    const columns = selectMatch[1].trim()
    if (columns === '*') {
      const fromMatch = query.match(/FROM\s+([^\s]+)/i)
      if (fromMatch) {
        const tablePath = fromMatch[1].trim().replace(/"/g, '')
        const tableData = getTableDataForColumns(tablePath)
        if (tableData && tableData.length > 0) {
          return Object.keys(tableData[0])
        }
      }
      return []
    } else {
      return columns.split(',').map(col => col.trim().replace(/.*\./g, ''))
    }
  }
  return []
}

const getTableDataForColumns = (tablePath) => {
  if (!jsonDB.value) return null
  
  const parts = tablePath.split('.')
  let current = jsonDB.value
  
  for (const part of parts) {
    const cleanPart = part.startsWith('"') && part.endsWith('"') ? part.slice(1, -1) : part
    if (current && typeof current === 'object' && cleanPart in current) {
      current = current[cleanPart]
    } else {
      return null
    }
  }
  
  return Array.isArray(current) ? current : null
}

onMounted(async () => {
  await loadFromSession()
  isLoading.value = false
})

const openJsonViewer = () => {
  showJsonViewer.value = true
}

const removeFile = async () => {
  jsonFile.value = null
  jsonData.value = null
  jsonDB.value = null
  queryResults.value = []
  columnNames.value = []
  fileSize.value = 0
  showJsonViewer.value = false
  isExecutingQuery.value = false
  queryLimited.value = false
  hasExplicitLimit.value = false
  totalResults.value = 0
  hasExecutedQuery.value = false
  sessionStorage.removeItem('jsonData')
  sessionStorage.removeItem('fileName')
  sessionStorage.removeItem('fileSize')
  try {
    await jsonCache.clear()
  } catch (error) {
    console.warn('Erro ao limpar cache IndexedDB:', error)
  }
}

const enableViewer = () => {
  forceEnableViewer.value = true
}

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const addToHistory = (query) => {
  const trimmedQuery = query.trim()
  if (!trimmedQuery || queryHistory.value.includes(trimmedQuery)) return

  queryHistory.value.unshift(trimmedQuery)
  if (queryHistory.value.length > 100) {
    queryHistory.value = queryHistory.value.slice(0, 100)
  }

  localStorage.setItem('queryHistory', JSON.stringify(queryHistory.value))
}

const selectHistoryQuery = (query) => {
  sqlQuery.value = query
  document.querySelector('.textarea-field').focus()
}

const selectTableQuery = (tableName) => {
  sqlQuery.value = `SELECT * FROM ${tableName}`
  document.querySelector('.textarea-field').focus()
}

const confirmRemoveFile = () => {
  confirm.require({
    message: 'Tem certeza que deseja remover o arquivo JSON? Esta ação não pode ser desfeita.',
    header: 'Confirmar remoção',
    icon: 'pi pi-exclamation-triangle',
    rejectProps: {
      label: 'Cancelar',
      severity: 'secondary',
      outlined: true
    },
    acceptProps: {
      label: 'Remover',
      severity: 'danger'
    },
    accept: () => {
      removeFile()
    }
  })
}
</script>

<template>
  <main class="main-container">
    <div v-if="isLoading" class="loading-container">
      <div class="loading-content">
        <Skeleton height="40px" width="200px" style="margin-bottom: 15px;"></Skeleton>
        <Skeleton height="20px" width="150px"></Skeleton>
      </div>
    </div>

    <div v-else-if="!jsonFile" class="upload-container">
      <FileUpload
          mode="basic"
          :auto="false"
          accept=".json"
          :maxFileSize="10000000"
          @select="onFileSelect"
          chooseLabel="Selecionar arquivo JSON"
      />
    </div>

    <div v-else class="interface-container">
      <div class="top-section" :style="`height: ${topHeight}vh;`">
        <div class="textarea-container">
          <div class="textarea-wrapper">
            <Textarea
                v-model="sqlQuery"
                placeholder="Digite sua query SQL aqui (ex: SELECT * FROM dataArray WHERE id > 1) - Pressione Ctrl+Enter para executar"
                class="textarea-field"
                @keyup.ctrl.enter="executeQuery"
            />
            <Message
                v-if="queryLimited && !hasExplicitLimit && !isExecutingQuery"
                severity="info"
                :closable="false"
                class="textarea-message"
            >
              Mostrando {{ queryResults.length }} de {{ totalResults }} resultados. Use "LIMIT X" para especificar um limite ou "LIMIT -1" para remover a limitação.
            </Message>
          </div>
        </div>

        <div class="history-container">
          <div class="history-header">
            Histórico de Consultas
          </div>
          <div class="history-content">
            <div v-if="queryHistory.length === 0" class="history-empty">
              Nenhuma consulta executada ainda
            </div>
            <div
                v-for="(query, index) in queryHistory"
                :key="index"
                @click="selectHistoryQuery(query)"
                class="history-item"
            >
              {{ query }}
            </div>
          </div>
        </div>
      </div>

      <div
          @mousedown="startResize"
          class="resize-divider"
      >
        <div class="resize-handle"></div>
      </div>

      <div class="bottom-section" :style="`height: ${100 - topHeight - 2}vh;`">
        <div class="results-container">
          <div v-if="isExecutingQuery" class="skeleton-container">
            <div class="skeleton-content">
              <Skeleton height="30px" class="skeleton-item"></Skeleton>
              <Skeleton height="20px" class="skeleton-item"></Skeleton>
              <Skeleton height="20px" class="skeleton-item"></Skeleton>
              <Skeleton height="20px" class="skeleton-item"></Skeleton>
              <Skeleton height="20px" class="skeleton-item"></Skeleton>
              <Skeleton height="20px" class="skeleton-item"></Skeleton>
            </div>
          </div>

          <DataTable
              v-else-if="hasExecutedQuery && (columnNames.length > 0 || queryResults.length > 0)"
              :value="queryResults"
              scrollable
              scrollHeight="100%"
              class="results-table"
          >
            <Column
                field="_index"
                :header="null"
                class="index-column"
            >
              <template #body="slotProps">
                {{ slotProps.index + 1 }}
              </template>
            </Column>
            <Column
                v-for="col in columnNames"
                :key="col"
                :field="col"
                :header="col"
            />
            <template v-if="queryResults.length === 0" #empty>
              <div class="empty-results">
                0 resultados encontrados
              </div>
            </template>
          </DataTable>

          <div v-else-if="!isExecutingQuery && !hasExecutedQuery" class="no-results">
            Execute uma query para ver os resultados (Ctrl+Enter)
          </div>
          
          <div v-else-if="!isExecutingQuery && hasExecutedQuery && queryResults.length === 0" class="no-results">
            <DataTable
                :value="[]"
                scrollable
                scrollHeight="100%"
                class="results-table"
            >
              <template #empty>
                <div class="empty-results">
                  0 resultados encontrados
                </div>
              </template>
            </DataTable>
          </div>
        </div>

        <div class="json-summary">
          <div v-if="jsonSummary">
            <div class="file-info">
              <div class="file-header">
                <div>
                  <strong>Arquivo:</strong>
                  <span
                      @click="openJsonViewer"
                      class="file-link"
                  >
                    {{ jsonFile.name }}
                  </span>
                </div>
                <Button
                    label="Remover"
                    @click="confirmRemoveFile"
                    size="small"
                    severity="danger"
                    class="remove-btn"
                />
              </div>
              <p><strong>Tamanho:</strong> {{ formatFileSize(fileSize) }}</p>
            </div>

            <div class="tables-section">
              <h4 class="tables-title">Tabelas disponíveis:</h4>
              <div class="tables-list">
                <div v-for="table in jsonSummary.tables" :key="table" class="table-item" @click="selectTableQuery(table)">
                  <code class="table-code">{{ table }}</code>
                </div>
                <div v-if="jsonSummary.tables.length === 0" class="tables-empty">
                  Nenhuma tabela encontrada
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <Dialog
        v-model:visible="showJsonViewer"
        class="dialog-container"
        :header="'Visualizador JSON - ' + jsonFile?.name"
        :modal="true"
        :closable="true"
    >
      <div v-if="jsonViewerDisabled && !forceEnableViewer">
        <Message
            severity="warn"
            :closable="false"
            class="dialog-warning"
        >
          <div class="dialog-warning-content">
            <span>
              O visualizador JSON está desabilitado porque o arquivo é muito grande ({{ formatFileSize(fileSize) }}). 
              Isso pode causar lentidão no navegador.
            </span>
            <Button
                label="Habilitar mesmo assim"
                @click="enableViewer"
                size="small"
                severity="warning"
                class="dialog-enable-btn"
            />
          </div>
        </Message>
      </div>

      <div v-if="!jsonViewerDisabled || forceEnableViewer" class="dialog-viewer">
        <JsonViewer :value="jsonData" copyable boxed sort theme="light"/>
      </div>
    </Dialog>

    <ConfirmDialog></ConfirmDialog>
  </main>
</template>