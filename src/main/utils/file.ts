import * as fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { isPortable } from '@main/constant'
import { audioExts, documentExts, imageExts, textExts, videoExts } from '@shared/config/constant'
import { FileType, FileTypes } from '@types'
import { app } from 'electron'
import { v4 as uuidv4 } from 'uuid'

// 创建文件类型映射表，提高查找效率
const fileTypeMap = new Map<string, FileTypes>()

// 初始化映射表
function initFileTypeMap() {
  imageExts.forEach((ext) => fileTypeMap.set(ext, FileTypes.IMAGE))
  videoExts.forEach((ext) => fileTypeMap.set(ext, FileTypes.VIDEO))
  audioExts.forEach((ext) => fileTypeMap.set(ext, FileTypes.AUDIO))
  textExts.forEach((ext) => fileTypeMap.set(ext, FileTypes.TEXT))
  documentExts.forEach((ext) => fileTypeMap.set(ext, FileTypes.DOCUMENT))
}

// 初始化映射表
initFileTypeMap()

export function hasWritePermission(path: string) {
  try {
    fs.accessSync(path, fs.constants.W_OK)
    return true
  } catch (error) {
    return false
  }
}

function getAppDataPathFromConfig() {
  try {
    const configPath = path.join(getConfigDir(), 'config.json')
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
      if (config.appDataPath && fs.existsSync(config.appDataPath) && hasWritePermission(config.appDataPath)) {
        return config.appDataPath
      }
    }
  } catch (error) {
    return null
  }
  return null
}

export function initAppDataDir() {
  const appDataPath = getAppDataPathFromConfig()
  if (appDataPath) {
    app.setPath('userData', appDataPath)
    return
  }

  if (isPortable) {
    const portableDir = process.env.PORTABLE_EXECUTABLE_DIR
    app.setPath('userData', path.join(portableDir || app.getPath('exe'), 'data'))
    return
  }
}

export function updateConfig(appDataPath: string) {
  const configDir = getConfigDir()
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true })
  }

  const configPath = path.join(getConfigDir(), 'config.json')
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, JSON.stringify({ appDataPath }, null, 2))
    return
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
  config.appDataPath = appDataPath
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
}

export function getFileType(ext: string): FileTypes {
  ext = ext.toLowerCase()
  return fileTypeMap.get(ext) || FileTypes.OTHER
}

export function getAllFiles(dirPath: string, arrayOfFiles: FileType[] = []): FileType[] {
  const files = fs.readdirSync(dirPath)

  files.forEach((file) => {
    if (file.startsWith('.')) {
      return
    }

    const fullPath = path.join(dirPath, file)
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles)
    } else {
      const ext = path.extname(file)
      const fileType = getFileType(ext)

      if ([FileTypes.OTHER, FileTypes.IMAGE, FileTypes.VIDEO, FileTypes.AUDIO].includes(fileType)) {
        return
      }

      const name = path.basename(file)
      const size = fs.statSync(fullPath).size

      const fileItem: FileType = {
        id: uuidv4(),
        name,
        path: fullPath,
        size,
        ext,
        count: 1,
        origin_name: name,
        type: fileType,
        created_at: new Date().toISOString()
      }

      arrayOfFiles.push(fileItem)
    }
  })

  return arrayOfFiles
}

export function getTempDir() {
  return path.join(app.getPath('temp'), 'CherryStudio')
}

export function getFilesDir() {
  return path.join(app.getPath('userData'), 'Data', 'Files')
}

export function getConfigDir() {
  return path.join(os.homedir(), '.cherrystudio', 'config')
}

export function getCacheDir() {
  return path.join(app.getPath('userData'), 'Cache')
}

export function getAppConfigDir(name: string) {
  return path.join(getConfigDir(), name)
}
