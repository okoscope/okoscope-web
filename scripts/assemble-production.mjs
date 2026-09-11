import { cp, mkdir, rm } from 'node:fs/promises'
import path from 'node:path'

const repositoryRoot = path.resolve(import.meta.dirname, '..')
const documentationOutput = path.join(repositoryRoot, 'public-docs/dist')
const target = path.join(repositoryRoot, 'dist/docs')

await rm(target, { recursive: true, force: true })
await mkdir(target, { recursive: true })
await cp(documentationOutput, target, { recursive: true })
console.log('Assembled application and documentation in dist/.')
