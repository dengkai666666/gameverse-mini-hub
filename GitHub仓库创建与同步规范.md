# 通用 AI GitHub 建仓与代码同步规范

> 本文档是可直接交给任意 AI 执行的通用指令。AI 必须先分析收到的当前项目，再按本文档创建和维护该项目自己的 GitHub 仓库；不得把本文档所在项目的信息套用到其他项目。

## 使用方式

- 直接把本文档交给 AI，即表示本文全部规则在该项目后续对话中持续生效，无需重复提醒。
- 对支持项目指令文件的 AI，建议将本文内容复制为项目根目录的 `AGENTS.md`，使其进入项目后自动读取。
- 本文档不保存任何项目专属仓库名、路径或提交号；这些信息必须由 AI 分析当时收到的项目后再确定。

## 用户固定偏好

- GitHub 主账号：`dengkai666666`
- 所有独立项目分别创建仓库，不使用账号名作为普通项目仓库名。
- 不再使用旧发布目录 `D:\Desktop\建2（git）\frymif.github.io`。
- 新仓库默认创建为 **Private**，只有用户明确要求时才改为 Public。
- 禁止自动执行删除仓库、删除分支、删除文件、覆盖远端历史和 force push 等高风险操作。
- 默认由 AI 自主分析、命名、创建 Private 仓库并完成首次推送；只有项目归属、仓库命名或上传范围存在实质歧义时才询问用户。
- GitHub 操作必须全程非交互；禁止弹出账号选择、网页登录、设备登录或凭据确认窗口。

## 一次性认证前提

本文档不会保存 GitHub Token。用户只需提前在 Windows 凭据管理器中保存一次 `dengkai666666` 的 GitHub Personal Access Token；Token 至少需要创建 Private 仓库和推送代码所需权限。需要发布 GitHub Actions 工作流时，还必须具备 `workflow` 权限。

AI 执行时必须遵守：

- 优先复用 Windows Git Credential Manager 已保存的凭据。
- 不在命令、日志、提交、文档或回答中输出 Token。
- 不把 Token 写入远程 URL、项目文件、环境文件或 Git 配置。
- 凭据缺失或失效时直接停止并说明，不允许打开交互登录窗口。
- 不自动安装 GitHub CLI；若本机已有 `gh`，也只有确认其已登录正确账号且不会弹窗时才可使用。

如果电脑尚未保存凭据，用户可先手动执行一次普通 GitHub HTTPS 登录，或在“控制面板 → 凭据管理器 → Windows 凭据”中保存：

```text
地址：git:https://github.com
用户名：dengkai666666
密码：GitHub Personal Access Token
```

## 仓库命名

1. 创建仓库前必须先阅读并分析项目，至少确认项目类型、核心功能、视觉风格、目标用户和后续扩展方向。
2. 根据分析结果总结命名依据，再拟定 3～5 个有辨识度的候选名称，并说明每个名称与项目的对应关系。
3. 默认由 AI 直接选择匹配度最高且未被占用的名称，并在 `项目变更记录.md` 中记录候选名称和选择理由；只有多个名称同样合理或名称可能影响既有品牌时才让用户确认。
4. 名称必须体现项目主题或产品气质，优先使用简短英文短语。
5. 避免 `test`、`project1`、账号名、日期等无辨识度名称。
6. 创建前先检查账号下是否重名。

## 通用安全规则

- 除非用户明确要求，不改为 Public，不开启公开 Pages。
- 不自动删除仓库、分支或文件，不使用 force push。
- 不覆盖不明来源的远端历史；若远端非空或分支冲突，先停止并核对。
- 不把访问令牌、密码、密钥、Cookie、`.env`、虚拟环境、依赖目录或个人配置提交到仓库。
- 项目已有 `.git` 或 `origin` 时，必须先检查现有远端和历史，不得擅自新建仓库或替换远端。
- 所有实际改动必须追加记录到项目根目录的 `项目变更记录.md`。
- 禁止使用 `git add .`、`git add -A` 或无审查的目录整体上传；必须明确列出并检查将要提交的文件。
- 运行数据、构建缓存、虚拟环境、本地 AI 配置、用户内容、日志和密钥文件默认排除。
- 远端仓库创建失败时不得反复弹窗或切换账号；只报告明确错误。

## 非交互 GitHub 认证硬规则

每次读取远端、创建提交或推送前，PowerShell 会话必须设置：

```powershell
$env:GCM_INTERACTIVE='0'
$env:GIT_TERMINAL_PROMPT='0'
```

当前项目的远程地址必须固定用户名：

```powershell
git remote set-url origin "https://dengkai666666@github.com/dengkai666666/<仓库名>.git"
```

当前仓库必须使用仓库级配置，不得污染其他项目：

```powershell
git config --local credential.https://github.com.username dengkai666666
git config --local credential.interactive false
```

执行远端操作前先进行无弹窗认证探测：

```powershell
$env:GCM_INTERACTIVE='0'
$env:GIT_TERMINAL_PROMPT='0'
git ls-remote origin refs/heads/main
```

- 成功：继续执行。
- 仓库尚未创建：进入自动建仓流程。
- 凭据错误或缺失：立即停止，不允许取消上述非交互设置后重试。
- 禁止把账号或 Token 放进全局 Git 配置；固定用户名使用当前仓库的 `--local` 配置。

## 自动创建 Private 仓库

当项目没有合适远端时，AI 默认自行创建仓库，不要求用户打开浏览器。优先顺序：

1. 若已安装且已正确登录目标账号的 GitHub CLI，可使用：

   ```powershell
   gh repo create "dengkai666666/<仓库名>" --private --description "<项目简介>" --disable-wiki
   ```

2. 否则使用 Git Credential Manager 中的 Token 调用 GitHub REST API。Token 只能保存在当前 PowerShell 进程内存中，任何输出都不得包含 Token。创建请求必须指定：

   ```json
   {
     "name": "<仓库名>",
     "description": "<项目简介>",
     "private": true,
     "has_issues": true,
     "has_projects": false,
     "has_wiki": false,
     "auto_init": false
   }
   ```

3. 创建后立即通过 GitHub API核验：所有者为 `dengkai666666`、仓库名正确、`private=true`、默认分支预期为 `main`。
4. 若同名仓库已存在，先判断它是否就是当前项目的远端；无法证明时不得复用或覆盖，应更换名称或询问用户。
5. API 返回权限不足、组织限制或凭据错误时直接停止，不打开登录窗口。

### REST API 建仓参考实现（PowerShell）

以下脚本只从 Git Credential Manager 读取 Token 到当前进程内存，不打印 Token。执行前必须把占位符替换为经过项目分析得到的值：

```powershell
$ErrorActionPreference = 'Stop'
$env:GCM_INTERACTIVE = '0'
$env:GIT_TERMINAL_PROMPT = '0'

$credentialLines = "protocol=https`nhost=github.com`n`n" | git credential fill
$credential = @{}
foreach ($line in $credentialLines) {
    if ($line -match '^([^=]+)=(.*)$') {
        $credential[$matches[1]] = $matches[2]
    }
}
$token = $credential['password']
if (-not $token) {
    throw 'GitHub 凭据不存在；已停止且不会打开交互登录窗口。'
}

$headers = @{
    Accept = 'application/vnd.github+json'
    Authorization = "Bearer $token"
    'X-GitHub-Api-Version' = '2022-11-28'
    'User-Agent' = 'codex-private-repo-creator'
}
$payload = @{
    name = '<仓库名>'
    description = '<项目简介>'
    private = $true
    has_issues = $true
    has_projects = $false
    has_wiki = $false
    auto_init = $false
} | ConvertTo-Json

$repo = Invoke-RestMethod `
    -Method Post `
    -Uri 'https://api.github.com/user/repos' `
    -Headers $headers `
    -ContentType 'application/json; charset=utf-8' `
    -Body ([Text.Encoding]::UTF8.GetBytes($payload))

if ($repo.owner.login -ne 'dengkai666666' -or -not $repo.private) {
    throw '仓库所有者或 Private 状态核验失败。'
}
```

脚本结束后不得输出 `$token`、`$headers` 或完整凭据对象。GitHub API 官方参考：

- https://docs.github.com/en/rest/repos/repos#create-a-repository-for-the-authenticated-user
- https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens

## 新项目首次建仓流程

1. 阅读当前项目的 `AGENTS.md`、README、入口文件、目录结构、配置和核心代码。
2. 确认项目根目录存在 `项目变更记录.md`，没有则创建。
3. 判断当前项目是否已经是 Git 仓库、是否已有远端、远端是否属于目标账号；已有仓库时优先维护现有仓库。
4. 完成项目定位与命名分析，检查待上传内容是否包含秘密信息、本地环境或依赖目录。
5. 按“仓库命名”规则拟定候选名称、记录理由、自主选择最终名称并检查账号下是否重名。
6. 仅在当前项目没有合适远端时，在 `dengkai666666` 下创建 Private 仓库。
7. 仅在当前项目尚未初始化 Git 时执行初始化，默认分支使用 `main`。
8. 将 `origin` 设置为当前项目自己的 HTTPS 仓库地址，不得复用其他项目地址。
9. 首次提交后使用普通 `git push -u origin main`，禁止 `--force`。
10. 核验本地 HEAD、远端 main、仓库名称、所属账号和 Private 状态。

### 首次上传文件选择

首次发布前必须建立“允许上传清单”和“明确排除清单”。至少检查：

```text
允许候选：源码、必要静态资源、依赖清单、README、LICENSE、测试、CI、运行说明
默认排除：.env、Token、日志、用户数据、数据库、上传文件、venv、node_modules、缓存、dist、build、本地 AI 配置
```

AI 必须先检查 `.gitignore`，再逐个暂存已确认文件。例如：

```powershell
git add -- README.md LICENSE src tests requirements.txt
```

不得因为“方便”而执行 `git add .`。

## 后续实时同步约定

每轮完成有效代码改动后按此顺序执行：

1. 将本轮所有文件改动追加到 `项目变更记录.md`。
2. 运行 `git status` 检查改动范围。
3. 如果项目已有经过检查的安全同步脚本，先运行其预演模式；否则手动检查并同步。
4. 当前项目使用 `sync.ps1` 时，可运行：

```powershell
./sync.ps1 -Message "简洁准确的中文提交信息"
```

任何项目同步脚本都必须满足：

- 只允许推送到当前项目固定的 `origin`。
- 发现删除状态立即停止，不自动提交删除。
- 只使用普通 push，不使用 force push。
- 没有改动时不创建空提交。
- 推送被拒绝、远端领先或历史不一致时立即停止，不自动 rebase、reset 或 force push。

这里的“实时同步”指每轮有效改动完成并验证后立即提交、推送；不启用常驻文件监控程序，避免误把临时文件或未完成代码自动上传。

## 没有同步脚本时的安全流程

1. 运行 `git status --short` 并人工检查全部状态。
2. 如发现删除、远端异常或秘密文件，停止操作并说明原因。
3. 只暂存确认过的新增和修改；不自动暂存删除。
4. 使用准确的中文提交信息创建提交。
5. 使用普通 `git push origin main` 推送。
6. 对比本地 HEAD 与远端 main，并确认工作区干净。

## 本地旧 Git 历史不适合上传时

如果项目目录存在与当前发布无关的旧提交、巨大历史或混杂文件，不得直接推送旧历史，也不得执行 reset、清空或删除 `.git`。可使用临时独立索引创建精选提交：

1. 读取远端 `main`；新仓库则使用空树。
2. 将 `GIT_INDEX_FILE` 指向项目内已忽略目录中的唯一临时索引。
3. 只向临时索引加入允许上传清单。
4. 使用 `git write-tree` 和 `git commit-tree` 创建精选提交。
5. 只有新建空仓库或确认父提交等于远端 `main` 时才普通推送。
6. 不删除临时索引；可留在已忽略目录中，避免任何高风险清理命令。

## 弹窗防止核对表

每次同步前必须确认：

- [ ] `origin` URL 已包含固定用户名 `dengkai666666@github.com`
- [ ] 当前仓库设置了 `credential.https://github.com.username=dengkai666666`
- [ ] 当前仓库设置了 `credential.interactive=false`
- [ ] 当前进程设置了 `GCM_INTERACTIVE=0`
- [ ] 当前进程设置了 `GIT_TERMINAL_PROMPT=0`
- [ ] 已使用 `git ls-remote` 完成无弹窗探测
- [ ] 凭据失败时会直接停止，而不是切换为交互登录

## AI 完成后的必报信息

- 项目分析得到的命名依据和最终仓库名。
- 仓库 URL、所属账号、分支和 Private/Public 状态。
- 本次提交哈希及本地/远端是否一致。
- 实际新增、修改的文件，以及是否发现未处理风险。
- 是否使用了非交互认证、账号选择窗口是否为零次弹出。
- 仓库创建方式（已有远端、GitHub CLI 或 REST API）以及 Private 状态核验结果。
