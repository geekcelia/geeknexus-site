# Agent Deploy Prompt

Use this prompt with a GitHub-authenticated agent:

```text
帮我把当前仓库部署到 GitHub Pages。

要求：
1. 如果当前目录还不是 git 仓库，先初始化 git 仓库。
2. 创建或使用 GitHub 仓库，仓库名建议用 geeknexus-agentbox。
3. 将当前静态网站文件推送到 main 分支。
4. 启用 GitHub Pages。优先使用仓库里的 .github/workflows/pages.yml，通过 GitHub Actions 部署静态页面。
5. 等部署完成后，把公开访问地址发给我，格式应该类似：
   https://用户名.github.io/geeknexus-agentbox/

这是纯静态 HTML/CSS 网站，不需要构建命令。
```

