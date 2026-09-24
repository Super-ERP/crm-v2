declare module "markdown-it-ins" {
  import type MarkdownIt from "markdown-it"
  const plugin: (markdown: MarkdownIt) => void
  export default plugin
}
