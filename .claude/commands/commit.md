---
allowed-tools: Bash(git checkout*, git branch*, git commit*, git status*, git diff*, git log*)
description: 在主分支上创建提交
---

## 任务

在主分支上创建提交本地修改的代码

### 工作流程

1. 在 main 分支上提交修改，创建 commit
1. 返回创建成功的 commit 完整信息

## 当前状态

- 当前分支: !`git branch --show-current`
- 修改的文件: !`git status --porcelain | head -10`

## 注意事项

- 提交信息应遵循 Angular Conventional Commit 规范，简单格式满足：`<type>: <subject>`。其中 `type: feat, fix, docs, style, refactor, test, chore, perf, ci, build, revert`，subject 要求简洁描述，动词原形，首字母小写，结尾不加句号
- 如修改文件或内容较多，需要相应补充提交的描述信息
- 不要使用 `--amend` 合并到最新提交中，如认为本地修改是对最新提交的补充修改希望合并，请询问我
