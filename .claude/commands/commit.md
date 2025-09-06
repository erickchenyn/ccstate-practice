---
allowed-tools: Bash(git checkout*, git branch*, git commit*, git status*, git diff*, git log*)
description: 在主分支上创建提交
---

## 任务

在主分支上创建提交本地修改的代码

### 工作流程

1. 在 main 分支上提交修改，创建 commit
1. 返回创建成功的 commit 信息，以及展示最近的 5 条 commit 标题

## 当前状态

- 当前分支: !`git branch --show-current`
- 本地修改的文件: !`git status --porcelain | head -10`
- 最近的 commit 记录：!`git log --oneline | head -5`

## 注意事项

- 提交信息应遵循 Angular Conventional Commit 规范，简单格式满足：`<type>: <subject>`。其中 `type: feat, fix, docs, style, refactor, test, chore, perf, ci, build, revert`，subject 要求简洁描述，动词原形，首字母小写，结尾不加句号
- 如果修改文件或内容较多，需要相应补充提交的描述信息
- 如果修改的文件明显做了不同的几件事，可以拆分成几个 commit 提交
- 不要使用 `--amend` 合并到已有的提交中，始终创建新的 commit 提交代码
