'use strict'

import { execSync, ExecSyncOptions } from 'child_process'
import fs from 'fs'
import path from 'path'

const packageJSON = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'),
)
const repo = `profoundlogic/${process.env.BROKER_PRODUCT}-${packageJSON.name}` // DockerHub repo name.
const tag = packageJSON.version
const DOCKER = 'sudo docker'

const execOpts: ExecSyncOptions = {
  cwd: path.join(__dirname, '..'),
}

// Remove old images.
let command = `${DOCKER} images -q ${repo}`
execOpts.stdio = 'pipe' // Capture output for this command.
const images = execSync(command, execOpts)
  .toString()
  .trim()
  .split('\n')
  .filter(line => line !== '')
execOpts.stdio = 'inherit' // Send next command outputs to stdout/stderr.
const toRemove: string[] = []
for (const image of images) {
  // Remove duplicates.
  if (!toRemove.includes(image)) {
    toRemove.push(image)
  }
}
for (const image of toRemove) {
  command = `${DOCKER} rmi -f ${image}`
  execSync(command, execOpts)
}

command = `${DOCKER} build -t ${repo}:${tag} -t ${repo}:latest .`
execSync(command, execOpts)
