#!/usr/bin/env node
import { cpSync, mkdirSync, existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const javaHome =
  process.env.JAVA_HOME ||
  '/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home'
const androidHome =
  process.env.ANDROID_HOME ||
  process.env.ANDROID_SDK_ROOT ||
  '/opt/homebrew/share/android-commandlinetools'

const env = {
  ...process.env,
  JAVA_HOME: javaHome,
  ANDROID_HOME: androidHome,
  ANDROID_SDK_ROOT: androidHome,
  PATH: `${javaHome}/bin:${process.env.PATH || ''}`,
}

const gradle = spawnSync('./gradlew', ['assembleDebug', '--no-daemon'], {
  cwd: resolve(root, 'android'),
  env,
  stdio: 'inherit',
})

if (gradle.status !== 0) {
  process.exit(gradle.status ?? 1)
}

const src = resolve(
  root,
  'android/app/build/outputs/apk/debug/app-debug.apk',
)
const outDir = resolve(root, 'dist-apk')
const dest = resolve(outDir, 'gamescroll-debug.apk')

if (!existsSync(src)) {
  console.error('APK not found at', src)
  process.exit(1)
}

mkdirSync(outDir, { recursive: true })
cpSync(src, dest)
console.log(`APK ready: ${dest}`)
