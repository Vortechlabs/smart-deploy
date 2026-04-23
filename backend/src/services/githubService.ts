import { Octokit } from '@octokit/rest'
import simpleGit from 'simple-git'
import fs from 'fs/promises'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import { detectLanguage, generateDockerfile } from './languageDetector'

const execAsync = promisify(exec)

export class GitHubService {
  private octokit: Octokit
  
  constructor(token: string) {
    this.octokit = new Octokit({ auth: token })
  }
  
  async getUserRepos() {
    const { data } = await this.octokit.repos.listForAuthenticatedUser({
      sort: 'updated',
      per_page: 100
    })
    return data
  }
  
  async getRepoBranches(owner: string, repo: string) {
    const { data } = await this.octokit.repos.listBranches({
      owner,
      repo
    })
    return data
  }
  
  async cloneRepo(repoUrl: string, branch: string, targetPath: string): Promise<void> {
    // Delete if exists
    try {
      await fs.rm(targetPath, { recursive: true, force: true })
    } catch (e) {}
    
    const git = simpleGit()
    await git.clone(repoUrl, targetPath, ['--branch', branch, '--single-branch', '--depth', '1'])
  }
  
  async generateAndWriteDockerfile(repoPath: string, port: number = 3000): Promise<string> {
    const runtime = await detectLanguage(repoPath)
    const dockerfile = await generateDockerfile(runtime, port)
    const dockerfilePath = path.join(repoPath, 'Dockerfile')
    await fs.writeFile(dockerfilePath, dockerfile)
    return runtime
  }
  
  async getLatestCommit(repoUrl: string, branch: string): Promise<{ hash: string; message: string }> {
    // Parse repo URL
    const match = repoUrl.match(/github\.com\/(.+?)\/(.+?)(\.git)?$/)
    if (!match) throw new Error('Invalid GitHub URL')
    
    const [, owner, repo] = match
    const { data } = await this.octokit.repos.getCommit({
      owner,
      repo,
      ref: branch
    })
    
    return {
      hash: data.sha.substring(0, 7),
      message: data.commit.message.split('\n')[0]
    }
  }
}