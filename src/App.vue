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
import Popover from 'primevue/popover'
import {useConfirm} from 'primevue/useconfirm'
import {JsonViewer} from 'vue3-json-viewer'
import {SqlUtils} from './utils/sql.utils.js'
import {JsonUtils} from './utils/json.utils.js'
import {jsonCache} from './utils/cache.js'
import {availableLanguages, currentLanguage, setLanguage, t} from './utils/i18n.js'
import {isDarkMode, toggleTheme} from './utils/theme.js'

const languagePanel = ref()

const currentFlag = computed(() => {
  const lang = availableLanguages.value.find(l => l.code === currentLanguage.value)
  return lang?.flag || 'US'
})

const toggleLanguageMenu = (event) => {
  languagePanel.value.toggle(event)
}

const selectLanguage = (langCode) => {
  setLanguage(langCode)
  languagePanel.value.hide()
}

const jsonFile = ref(null)
const sqlQuery = ref('')
const queryResults = ref([])
const jsonData = ref(null)
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
  const containerHeight = window.innerHeight - 40
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
    jsonData.value = JSON.parse(savedData)
    jsonFile.value = {name: savedFileName}
    fileSize.value = parseInt(savedFileSize) || 0
    jsonViewerDisabled.value = fileSize.value > 2 * 1024 * 1024
    return
  }

  try {
    const cacheData = await jsonCache.load()
    if (cacheData) {
      jsonData.value = cacheData.jsonData
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
        const isArray = Array.isArray(data)
        const isObjectWithSingleArray = !isArray && typeof data === 'object' && data !== null && Object.keys(data).length === 1

        if (!isArray && !isObjectWithSingleArray) {
          data = {root: [data]}
        }
        jsonData.value = data
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
  if (!jsonData.value || !sqlQuery.value.trim()) return

  isExecutingQuery.value = true
  queryLimited.value = false
  totalResults.value = 0

  try {
    await new Promise(resolve => setTimeout(resolve, 100))

    const result = SqlUtils.executeSQL(jsonData.value, sqlQuery.value)

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
  if (!jsonData.value) return null

  const parts = tablePath.split('.')
  let current = jsonData.value

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
  const parts = tableName.split('.')
  const quotedParts = parts.map(part => part.includes(' ') ? `"${part}"` : part)
  sqlQuery.value = "SELECT * FROM " + quotedParts.join('.')
  document.querySelector('.textarea-field').focus()
}

const confirmRemoveFile = () => {
  confirm.require({
    message: t('file.confirmRemove'),
    header: t('file.confirmRemoveHeader'),
    icon: 'pi pi-exclamation-triangle',
    rejectProps: {
      label: t('file.cancel'),
      severity: 'secondary',
      outlined: true
    },
    acceptProps: {
      label: t('file.remove'),
      severity: 'danger'
    },
    accept: () => {
      removeFile()
    }
  })
}
</script>

<template>
  <div class="app-container">
    <div class="navbar">
      <div class="navbar-content">
        <h1 class="navbar-title">JSON Query SQL</h1>
        <div class="navbar-actions">
          <Button
              @click="toggleTheme"
              class="theme-button"
              text
              rounded
          >
            <i :class="isDarkMode ? 'pi pi-sun' : 'pi pi-moon'"></i>
          </Button>
          <Button
              @click="toggleLanguageMenu"
              class="language-button"
              text
              rounded
          >
            <img
                :src="`/src/assets/flags/${currentFlag}.svg`"
                :alt="currentLanguage"
                class="flag-icon"
            />
          </Button>
          <Popover ref="languagePanel" class="language-panel">
            <div class="language-list">
              <div
                  v-for="lang in availableLanguages"
                  :key="lang.code"
                  @click="selectLanguage(lang.code)"
                  class="language-item"
              >
                <img
                    :src="`/src/assets/flags/${lang.flag}.svg`"
                    :alt="lang.name"
                    class="flag-icon"
                />
                <span>{{ lang.name }}</span>
              </div>
            </div>
          </Popover>
        </div>
      </div>
    </div>

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
            :chooseLabel="t('upload.selectFile')">
          <template #filelabel>&nbsp;</template>
        </FileUpload>
      </div>

      <div v-else class="interface-container">
        <div class="top-section" :style="`height: ${topHeight}vh;`">
          <div class="textarea-container">
            <div class="textarea-wrapper">
            <Textarea
                v-model="sqlQuery"
                :placeholder="t('query.placeholder')"
                class="textarea-field"
                @keyup.ctrl.enter="executeQuery"
            />
              <Message
                  v-if="queryLimited && !hasExplicitLimit && !isExecutingQuery"
                  severity="info"
                  :closable="false"
                  class="textarea-message"
              >
                {{ t('query.limitedResults', {current: queryResults.length, total: totalResults}) }}
              </Message>
            </div>
          </div>

          <div class="history-container">
            <div class="history-header">
              {{ t('query.history') }}
            </div>
            <div class="history-content">
              <div v-if="queryHistory.length === 0" class="history-empty">
                {{ t('query.noHistory') }}
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
              <template #empty>
                <div class="empty-results">
                  {{ t('query.emptyResults') }}
                </div>
              </template>
            </DataTable>

            <div v-else-if="!isExecutingQuery && !hasExecutedQuery" class="no-results">
              {{ t('query.noResults') }}
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
                    {{ t('query.emptyResults') }}
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
                    <strong>{{ t('file.file') }}</strong>
                    <span
                        @click="openJsonViewer"
                        class="file-link"
                    >
                    {{ jsonFile.name }}
                  </span>
                  </div>
                  <Button
                      :label="t('file.remove')"
                      @click="confirmRemoveFile"
                      size="small"
                      severity="danger"
                      class="remove-btn"
                  />
                </div>
                <p><strong>{{ t('file.size') }}</strong> {{ formatFileSize(fileSize) }}</p>
              </div>

              <div class="tables-section">
                <h4 class="tables-title">{{ t('file.tables') }}</h4>
                <div class="tables-list">
                  <div v-for="table in jsonSummary.tables" :key="table" class="table-item" @click="selectTableQuery(table)">
                    <code class="table-code">{{ table }}</code>
                  </div>
                  <div v-if="jsonSummary.tables.length === 0" class="tables-empty">
                    {{ t('file.noTables') }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog
          v-model:visible="showJsonViewer"
          class="json-viewer-dialog-container"
          :header="t('viewer.title', { filename: jsonFile?.name })"
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
            {{ t('viewer.disabled', {size: formatFileSize(fileSize)}) }}
            </span>
              <Button
                  :label="t('viewer.enableAnyway')"
                  @click="enableViewer"
                  size="small"
                  severity="warning"
                  class="dialog-enable-btn"
              />
            </div>
          </Message>
        </div>

        <div v-if="!jsonViewerDisabled || forceEnableViewer" class="dialog-viewer">
          <JsonViewer :value="jsonData" copyable boxed sort :theme="isDarkMode ? 'dark' : 'light'"/>
        </div>
      </Dialog>

      <ConfirmDialog></ConfirmDialog>
    </main>
  </div>
</template>

<style scoped>

.dark-mode {
  .navbar, .history-header, :deep(.p-datatable-header-cell) {
    background: #242424;
    color: #cccccc;
  }

  .history-item:hover, .table-item:hover {
    background: #181818;
  }

  :deep(.p-datatable-tbody > tr) {
    background: #525252;
  }

  :deep(.results-table .index-column) {
    background-color: #484747;
    border-right-color: #666;
  }

  .p-textarea, .results-container, .resize-divider, .json-summary, .history-container {
    background: var(--p-surface-800);
    border-color: var(--p-surface-600);
    border-radius: 6px;
    color: #cccccc;
  }

  .no-results {
    color: #cccccc;
  }

  .tables-list {
    background: #242424;
    border: 1px solid var(--p-surface-600);
  }
}

.app-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.navbar {
  background: #fff;
  border-bottom: 1px solid #e9ecef;
  padding: 0 1rem;
  height: 60px;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.navbar-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.navbar-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #2196f3;
}

.navbar-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.theme-button,
.language-button {
  padding: 0.5rem;
}

.flag-icon {
  width: 24px;
  height: 16px;
  border-radius: 2px;
}

.language-panel {
  min-width: 150px;
}

.language-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.language-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.language-item:hover {
  background-color: #f8f9fa;
}

.main-container {
  flex: 1;
  overflow: hidden;
}
</style>